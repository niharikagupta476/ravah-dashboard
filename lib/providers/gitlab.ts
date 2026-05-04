import type { PipelineModel, PipelineRunModel } from "@/lib/pipeline-copilot-types";

export function normalizeGitlabPipeline(input: PipelineModel): PipelineModel {
  return { ...input, provider: "gitlab" };
}

export function normalizeGitlabRun(input: PipelineRunModel): PipelineRunModel {
  return input;
}
