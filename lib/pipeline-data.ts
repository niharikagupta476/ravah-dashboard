import { prisma } from "@/lib/prisma";
import { analyzeLogs } from "@/lib/analyze-logs";
import { analyzePipelineRun } from "@/lib/analyze-pipeline-run";

export async function getPipelines(orgId: string, projectId?: string) {
  return prisma.pipeline.findMany({
    where: { orgId, ...(projectId ? { projectId } : {}) },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 1
      }
    },
    orderBy: { lastRunAt: "desc" }
  });
}

export async function getOrCreateInsightForRun(runId: string, orgId: string, projectId: string) {
  const existing = await prisma.insight.findFirst({
    where: { entityType: "pipelineRun", entityId: runId, orgId, projectId }
  });

  if (existing) return existing;

  const run = await prisma.pipelineRun.findUnique({
    where: { id: runId },
    include: { stages: true, jobs: true }
  });

  if (!run) return null;

  const generated = analyzeLogs(run.logsText);

  const analysis = analyzePipelineRun({
    run: {
      id: run.id,
      pipelineId: run.pipelineId,
      status: run.status,
      duration: run.duration,
      startedAt: run.startedAt,
      finishedAt: run.endedAt
    },
    stages: run.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      status: stage.status,
      duration: stage.duration
    })),
    jobs: run.jobs.map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      logs: job.logs,
      duration: job.duration
    })),
    logsText: run.logsText
  });

  return prisma.insight.create({
    data: {
      entityType: "pipelineRun",
      entityId: run.id,
      orgId,
      projectId,
      rootCause: analysis.rootCause || generated.rootCause,
      confidence: generated.confidence,
      suggestedFixJson: JSON.stringify(analysis.recommendations.length ? analysis.recommendations : generated.suggestedFix),
      riskImpact: generated.riskImpact,
      relatedChange: generated.relatedChange
    }
  });
}

export async function getPipelineDetail(
  pipelineId: string,
  orgId: string,
  projectId: string,
  orgIds?: string[],
  projectIds?: string[]
) {
  const accessibleOrgIds = orgIds?.length ? orgIds : [orgId];
  const accessibleProjectIds = projectIds?.length ? projectIds : [projectId];

  const pipeline = await prisma.pipeline.findFirst({
    where: {
      id: pipelineId,
      orgId: { in: accessibleOrgIds },
      projectId: { in: accessibleProjectIds }
    },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        include: { stages: true, jobs: true }
      }
    }
  });

  if (!pipeline) return null;

  const run = pipeline.runs[0];
  const insight = run ? await getOrCreateInsightForRun(run.id, pipeline.orgId, pipeline.projectId) : null;
  const activity = await prisma.activity.findMany({
    where: {
      orgId: pipeline.orgId,
      projectId: pipeline.projectId,
      OR: [
        { entityType: "pipeline", entityId: pipeline.id },
        ...(run ? [{ entityType: "pipelineRun", entityId: run.id }] : [])
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 8
  });

  return { pipeline, run, runs: pipeline.runs, insight, activity };
}

export async function getRunDetail(runId: string, orgId: string, projectId: string) {
  const runById = await prisma.pipelineRun.findFirst({
    where: { id: runId, orgId },
    include: {
      pipeline: true,
      stages: true,
      jobs: true
    }
  });

  const run =
    runById ??
    (await prisma.pipelineRun.findFirst({
      where: { githubRunId: runId, orgId },
      include: {
        pipeline: true,
        stages: true,
        jobs: true
      }
    }));

  if (!run) return null;

  const insight = await getOrCreateInsightForRun(run.id, orgId, run.projectId ?? projectId);
  const analysis = analyzePipelineRun({
    run: {
      id: run.id,
      pipelineId: run.pipelineId,
      status: run.status,
      duration: run.duration,
      startedAt: run.startedAt,
      finishedAt: run.endedAt
    },
    stages: run.stages.map((stage) => ({ id: stage.id, name: stage.name, status: stage.status, duration: stage.duration })),
    jobs: run.jobs.map((job) => ({ id: job.id, name: job.name, status: job.status, logs: job.logs, duration: job.duration })),
    logsText: run.logsText
  });

  return { run, insight, analysis };
}

export async function applyFix(pipelineId: string, orgId: string, projectId: string) {
  const pipeline = await prisma.pipeline.findFirst({ where: { id: pipelineId, orgId, projectId } });

  if (!pipeline) return null;

  const startedAt = new Date();
  const endedAt = new Date(startedAt.getTime() + 1000 * 60 * 6);
  const durationSec = 360;

  await prisma.$transaction(async (tx) => {
    const run = await tx.pipelineRun.create({
      data: {
        pipelineId: pipeline.id,
        orgId,
        projectId,
        status: "SUCCESS",
        startedAt,
        endedAt,
        duration: durationSec,
        logsText: "Ravah applied fix: updated ECR image tag and redeployed successfully.",
        stages: {
          createMany: {
            data: [
              { name: "Build", status: "SUCCESS", duration: 120, orgId, projectId },
              { name: "Tests", status: "SUCCESS", duration: 180, orgId, projectId },
              { name: "Deploy", status: "SUCCESS", duration: 60, orgId, projectId }
            ]
          }
        }
      }
    });

    await tx.job.createMany({
      data: [
        {
          pipelineRunId: run.id,
          orgId,
          projectId,
          name: "build-image",
          status: "SUCCESS",
          duration: 120,
          logs: "Docker build completed using cached layers."
        },
        {
          pipelineRunId: run.id,
          orgId,
          projectId,
          name: "deploy",
          status: "SUCCESS",
          duration: 60,
          logs: "Deployment completed after image tag update."
        }
      ]
    });

    await tx.pipeline.update({
      where: { id: pipeline.id },
      data: {
        status: "SUCCESS",
        lastRunAt: endedAt,
        durationSec
      }
    });

    await tx.activity.create({
      data: {
        message: "Fix applied (simulated): Updated ECR image tag",
        entityType: "pipeline",
        entityId: pipeline.id,
        orgId,
        projectId
      }
    });
  });

  return getPipelineDetail(pipelineId, orgId, projectId);
}
