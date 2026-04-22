import type { PipelineModel, PipelineRunModel } from "@/lib/pipeline-copilot-types";

export function normalizeJenkinsPipeline(input: PipelineModel): PipelineModel {
  return { ...input, provider: "jenkins" };
}

export function normalizeJenkinsRun(input: PipelineRunModel): PipelineRunModel {
  return input;
}
