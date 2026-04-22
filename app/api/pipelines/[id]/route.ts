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

  const { pipeline, run, runs, insight, activity } = detail;

  return NextResponse.json({
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
    runs: runs.map((pipelineRun) => ({
      id: pipelineRun.id,
      status: pipelineRun.status,
      startedAt: pipelineRun.startedAt,
      endedAt: pipelineRun.endedAt,
      duration: pipelineRun.duration
    })),
    run: run
      ? {
          id: run.id,
          startedAt: run.startedAt,
          endedAt: run.endedAt,
          status: run.status,
          duration: run.duration,
          logsText: run.logsText,
          stages: run.stages.map((stage) => ({
            id: stage.id,
            name: stage.name,
            status: stage.status,
            duration: stage.duration,
            errorCode: stage.errorCode,
            errorMessage: stage.errorMessage
          })),
          jobs: run.jobs.map((job) => ({
            id: job.id,
            name: job.name,
            status: job.status,
            duration: job.duration,
            logs: job.logs
          }))
        }
      : null
  });
}
