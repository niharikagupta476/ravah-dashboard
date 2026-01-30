import { prisma } from "@/lib/prisma";
import { analyzeLogs } from "@/lib/analyze-logs";

export async function getPipelines() {
  return prisma.pipeline.findMany({
    orderBy: { lastRunAt: "desc" }
  });
}

export async function getOrCreateInsightForRun(runId: string) {
  const existing = await prisma.insight.findFirst({
    where: { entityType: "pipelineRun", entityId: runId }
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
      rootCause: generated.rootCause,
      confidence: generated.confidence,
      suggestedFixJson: JSON.stringify(generated.suggestedFix),
      riskImpact: generated.riskImpact,
      relatedChange: generated.relatedChange
    }
  });
}

export async function getPipelineDetail(pipelineId: string) {
  const pipeline = await prisma.pipeline.findUnique({
    where: { id: pipelineId },
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
  const insight = run ? await getOrCreateInsightForRun(run.id) : null;
  const activity = await prisma.activity.findMany({
    where: { entityType: "pipeline", entityId: pipeline.id },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  return { pipeline, run, insight, activity };
}

export async function applyFix(pipelineId: string) {
  const pipeline = await prisma.pipeline.findUnique({ where: { id: pipelineId } });

  if (!pipeline) return null;

  const startedAt = new Date();
  const endedAt = new Date(startedAt.getTime() + 1000 * 60 * 6);
  const durationSec = 360;

  await prisma.$transaction(async (tx) => {
    await tx.pipelineRun.create({
      data: {
        pipelineId: pipeline.id,
        status: "SUCCESS",
        startedAt,
        endedAt,
        logsText: "Ravah applied fix: updated ECR image tag and redeployed successfully.",
        stages: {
          createMany: {
            data: [
              { name: "Build", status: "SUCCESS" },
              { name: "Tests", status: "SUCCESS" },
              { name: "Deploy", status: "SUCCESS" }
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
        message: "Ravah applied fix: Updated ECR image tag",
        entityType: "pipeline",
        entityId: pipeline.id
      }
    });
  });

  return getPipelineDetail(pipelineId);
}
