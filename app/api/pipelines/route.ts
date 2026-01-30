import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
  status: z.string().optional()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.parse({
    status: searchParams.get("status") ?? undefined
  });

  const pipelines = await prisma.pipeline.findMany({
    orderBy: { updatedAt: "desc" }
  });

  const filtered =
    parsed.status && parsed.status !== "all"
      ? pipelines.filter((pipeline) => pipeline.lastRunStatus === parsed.status)
      : pipelines;

  return NextResponse.json(
    filtered.map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.name,
      owner: pipeline.owner,
      env: pipeline.env,
      lastRunStatus: pipeline.lastRunStatus,
      lastRunDurationSec: pipeline.lastRunDurationSec,
      updatedAt: pipeline.updatedAt
    }))
  );
}
