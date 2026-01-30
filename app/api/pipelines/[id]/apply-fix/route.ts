import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string()
});

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = paramsSchema.parse(params);
  const pipeline = await prisma.pipeline.findUnique({
    where: { id }
  });

  if (!pipeline) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const startedAt = new Date();
  const endedAt = new Date(startedAt.getTime() + 1000 * 60 * 6);
  const durationSec = 360;

  const result = await prisma.$transaction(async (tx) => {
    const run = await tx.pipelineRun.create({
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
              { name: "Test", status: "SUCCESS" },
              { name: "Deploy", status: "SUCCESS" }
            ]
          }
        }
      }
    });

    const updatedPipeline = await tx.pipeline.update({
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

    return { run, updatedPipeline };
  });

  return NextResponse.json({
    pipelineId: result.updatedPipeline.id,
    status: result.updatedPipeline.status
  });
}
