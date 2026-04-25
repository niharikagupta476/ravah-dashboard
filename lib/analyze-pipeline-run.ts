import type { JobModel, PipelineRunModel, StageModel } from "@/lib/pipeline-copilot-types";

type AnalyzeInput = {
  run: PipelineRunModel;
  stages: StageModel[];
  jobs: JobModel[];
  logsText: string;
};

export type PipelineRunAnalysis = {
  summary: string;
  rootCause: string;
  failureCategory: string;
  recommendations: string[];
};

export function analyzePipelineRun(input: AnalyzeInput): PipelineRunAnalysis {
  const combinedText = `${input.logsText} ${input.jobs.map((job) => job.logs).join(" ")}`.toLowerCase();

  if (combinedText.includes("imagepullbackoff") || combinedText.includes("manifest unknown")) {
    return {
      summary: "Deployment failed because the image tag could not be pulled.",
      rootCause: "Container image tag mismatch in registry.",
      failureCategory: "Deployment",
      recommendations: [
        "Verify image tag exists in container registry",
        "Optimize Docker layer caching to reduce rebuild drift",
        "Pin deploy manifest to immutable digest"
      ]
    };
  }

  if (combinedText.includes("timeout") || combinedText.includes("timed out")) {
    return {
      summary: "Run failed due to dependency timeout during pipeline execution.",
      rootCause: "Network or downstream dependency latency spike.",
      failureCategory: "Infrastructure",
      recommendations: [
        "Enable cache for dependency installation",
        "Parallelize independent jobs",
        "Add retry policy for flaky network steps"
      ]
    };
  }

  if (combinedText.includes("test failed") || combinedText.includes("assertionerror")) {
    return {
      summary: "Automated tests failed and blocked deployment.",
      rootCause: "Failing test suite in CI.",
      failureCategory: "Testing",
      recommendations: [
        "Split test matrix to isolate flaky suites",
        "Run unit and integration suites in parallel",
        "Reduce build time before tests with selective caching"
      ]
    };
  }

  return {
    summary: `Run ${input.run.id} completed with ${input.run.status.toLowerCase()} status.`,
    rootCause: "Unknown failure pattern.",
    failureCategory: "Unknown",
    recommendations: [
      "Inspect failed job logs",
      "Optimize Docker layers for deterministic builds",
      "Reduce build time by splitting long-running tests"
    ]
  };
}
