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
    orderBy: { lastRunAt: "desc" }
  });

  const filtered =
    parsed.status && parsed.status !== "all"
      ? pipelines.filter((pipeline) => pipeline.status.toLowerCase() === parsed.status)
      : pipelines;

  return NextResponse.json(
    filtered.map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.name,
      service: pipeline.service,
      owner: pipeline.owner,
      env: pipeline.env,
      status: pipeline.status,
      durationSec: pipeline.durationSec,
      lastRunAt: pipeline.lastRunAt
    }))
  );
}
