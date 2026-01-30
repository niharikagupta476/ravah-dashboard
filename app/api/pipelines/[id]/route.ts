import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string()
});

export async function GET(
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

  if (!pipeline) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const run = pipeline.runs[0];

  return NextResponse.json({
    id: pipeline.id,
    name: pipeline.name,
    owner: pipeline.owner,
    env: pipeline.env,
    lastRunStatus: pipeline.lastRunStatus,
    lastRunDurationSec: pipeline.lastRunDurationSec,
    updatedAt: pipeline.updatedAt,
    run: run
      ? {
          id: run.id,
          startedAt: run.startedAt,
          endedAt: run.endedAt,
          status: run.status,
          durationSec: run.durationSec,
          stages: run.stages.map((stage) => ({
            id: stage.id,
            name: stage.name,
            status: stage.status,
            errorCode: stage.errorCode,
            errorSummary: stage.errorSummary
          }))
        }
      : null
  });
}
