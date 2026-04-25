import { NextResponse } from "next/server";
import { getPipelines } from "@/lib/pipeline-data";
import { getRequestContext } from "@/lib/context";
import { z } from "zod";

const querySchema = z.object({
  status: z.string().optional()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: searchParams.get("status") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query params" }, { status: 400 });
  }

  const context = await getRequestContext();
  if (!context) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const pipelines = await getPipelines(context.orgId, context.projectId);

  const filtered =
    parsed.data.status && parsed.data.status !== "all"
      ? pipelines.filter((pipeline) => pipeline.status.toLowerCase() === parsed.data.status)
      : pipelines;

  return NextResponse.json(
    filtered.map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.name,
      service: pipeline.service,
      provider: pipeline.provider,
      repo: pipeline.repo,
      branch: pipeline.branch,
      owner: pipeline.owner,
      env: pipeline.env,
      status: pipeline.status,
      durationSec: pipeline.durationSec,
      lastRunAt: pipeline.lastRunAt,
      lastRunStatus: pipeline.runs[0]?.status ?? pipeline.status
    }))
  );
}
