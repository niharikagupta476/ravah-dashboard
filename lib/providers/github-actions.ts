import type { JobModel, PipelineModel, PipelineRunModel, StageModel } from "@/lib/pipeline-copilot-types";

export function normalizeGithubActionsPipeline(input: {
  id: string;
  name: string;
  repository: string;
  branch: string;
  owner: string;
  status: string;
  lastRunAt: Date;
  durationSec: number;
}): PipelineModel {
  return {
    id: input.id,
    name: input.name,
    provider: "github-actions",
    repo: input.repository,
    branch: input.branch,
    owner: input.owner,
    status: input.status,
    lastRunAt: input.lastRunAt,
    durationSec: input.durationSec
  };
}

export function normalizeGithubActionsRun(input: {
  id: string;
  pipelineId: string;
  status: string;
  duration: number;
  startedAt: Date;
  finishedAt: Date | null;
}): PipelineRunModel {
  return {
    id: input.id,
    pipelineId: input.pipelineId,
    status: input.status,
    duration: input.duration,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt
  };
}

export function normalizeGithubActionsStages(stages: StageModel[]): StageModel[] {
  return stages;
}

export function normalizeGithubActionsJobs(jobs: JobModel[]): JobModel[] {
  return jobs;
}
