import { NextResponse } from "next/server";
import { getPipelineDetail } from "@/lib/pipeline-data";
import { getRequestContext } from "@/lib/context";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string()
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const { id } = parsedParams.data;
  const context = await getRequestContext();
  if (!context) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const detail = await getPipelineDetail(id, context.orgId, context.projectId);

  if (!detail) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const { pipeline, run, insight, activity } = detail;

  return NextResponse.json({
    id: pipeline.id,
    name: pipeline.name,
    service: pipeline.service,
    owner: pipeline.owner,
    env: pipeline.env,
    status: pipeline.status,
    durationSec: pipeline.durationSec,
    lastRunAt: pipeline.lastRunAt,
    activity: activity.map((entry) => ({
      id: entry.id,
      message: entry.message,
      createdAt: entry.createdAt
    })),
    insight: insight
      ? {
          id: insight.id,
          rootCause: insight.rootCause,
          confidence: insight.confidence,
          suggestedFix: JSON.parse(insight.suggestedFixJson) as string[],
          riskImpact: insight.riskImpact,
          relatedChange: insight.relatedChange
        }
      : null,
    run: run
      ? {
          id: run.id,
          startedAt: run.startedAt,
          endedAt: run.endedAt,
          status: run.status,
          logsText: run.logsText,
          stages: run.stages.map((stage) => ({
            id: stage.id,
            name: stage.name,
            status: stage.status,
            errorCode: stage.errorCode,
            errorMessage: stage.errorMessage
          }))
        }
      : null
  });
}
