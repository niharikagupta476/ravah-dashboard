import { prisma } from "@/lib/prisma";
import { analyzeLogs } from "@/lib/analyze-logs";

export async function getPipelines(orgId: string, projectId: string) {
  return prisma.pipeline.findMany({
    where: { orgId, projectId },
    orderBy: { lastRunAt: "desc" }
  });
}

export async function getOrCreateInsightForRun(runId: string, orgId: string, projectId: string) {
  const existing = await prisma.insight.findFirst({
    where: { entityType: "pipelineRun", entityId: runId, orgId, projectId }
  });

  if (existing) return existing;

  const run = await prisma.pipelineRun.findUnique({
    where: { id: runId }
  });

  if (!run) return null;

  const generated = analyzeLogs(run.logsText);

  return prisma.insight.create({
    data: {
      entityType: "pipelineRun",
      entityId: run.id,
      orgId,
      projectId,
      rootCause: generated.rootCause,
      confidence: generated.confidence,
      suggestedFixJson: JSON.stringify(generated.suggestedFix),
      riskImpact: generated.riskImpact,
      relatedChange: generated.relatedChange
    }
  });
}

export async function getPipelineDetail(pipelineId: string, orgId: string, projectId: string) {
  const pipeline = await prisma.pipeline.findUnique({
    where: { id: pipelineId, orgId, projectId },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: { stages: true }
      }
    }
  });

  if (!pipeline) return null;

  const run = pipeline.runs[0];
  const insight = run ? await getOrCreateInsightForRun(run.id, orgId, projectId) : null;
  const activity = await prisma.activity.findMany({
    where: {
      orgId,
      projectId,
      OR: [
        { entityType: "pipeline", entityId: pipeline.id },
        ...(run ? [{ entityType: "pipelineRun", entityId: run.id }] : [])
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  return { pipeline, run, insight, activity };
}

export async function applyFix(pipelineId: string, orgId: string, projectId: string) {
  const pipeline = await prisma.pipeline.findUnique({ where: { id: pipelineId, orgId, projectId } });

  if (!pipeline) return null;

  const startedAt = new Date();
  const endedAt = new Date(startedAt.getTime() + 1000 * 60 * 6);
  const durationSec = 360;

  await prisma.$transaction(async (tx) => {
    await tx.pipelineRun.create({
      data: {
        pipelineId: pipeline.id,
        orgId,
        projectId,
        status: "SUCCESS",
        startedAt,
        endedAt,
        logsText: "Ravah applied fix: updated ECR image tag and redeployed successfully.",
        stages: {
          createMany: {
            data: [
              { name: "Build", status: "SUCCESS", orgId, projectId },
              { name: "Tests", status: "SUCCESS", orgId, projectId },
              { name: "Deploy", status: "SUCCESS", orgId, projectId }
            ]
          }
        }
      }
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
