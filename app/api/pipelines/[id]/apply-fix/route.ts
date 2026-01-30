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
    where: { id },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: { stages: true }
      }
    }
  });

  if (!pipeline || pipeline.runs.length === 0) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const run = pipeline.runs[0];

  await prisma.pipelineStage.updateMany({
    where: { pipelineRunId: run.id },
    data: { status: "success", errorCode: null, errorSummary: null }
  });

  await prisma.pipelineRun.update({
    where: { id: run.id },
    data: {
      status: "success",
      endedAt: new Date(),
      durationSec: run.durationSec
    }
  });

  const updated = await prisma.pipeline.update({
    where: { id },
    data: { lastRunStatus: "success", lastRunDurationSec: run.durationSec }
  });

  return NextResponse.json({
    pipelineId: updated.id,
    status: updated.lastRunStatus
  });
}
