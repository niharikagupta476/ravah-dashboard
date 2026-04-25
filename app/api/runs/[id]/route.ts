import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/context";
import { getRunDetail } from "@/lib/pipeline-data";

const paramsSchema = z.object({ id: z.string() });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const context = await getRequestContext();
  if (!context) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const detail = await getRunDetail(parsedParams.data.id, context.orgId, context.projectId);
  if (!detail) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: detail.run.id,
    pipelineId: detail.run.pipelineId,
    pipelineName: detail.run.pipeline.name,
    status: detail.run.status,
    duration: detail.run.duration,
    startedAt: detail.run.startedAt,
    finishedAt: detail.run.endedAt,
    logsText: detail.run.logsText,
    stages: detail.run.stages,
    jobs: detail.run.jobs,
    analysis: detail.analysis
  });
}
