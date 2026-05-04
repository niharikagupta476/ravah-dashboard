import type { PipelineRun, Pipeline, Job, Stage } from "@prisma/client";

export type RunRcaOutput = {
  summary: string;
  rootCause: string;
  failureCategory: "dependency" | "test" | "build" | "deployment" | "infra" | "auth" | "unknown";
  confidence: "low" | "medium" | "high";
  evidence: string[];
  suggestedFixes: string[];
  riskImpact: string;
  nextSteps: string[];
};

function safeJsonParse(text: string): RunRcaOutput | null {
  try {
    return JSON.parse(text) as RunRcaOutput;
  } catch {
    return null;
  }
}

export async function analyzeRunWithAI(input: {
  pipeline: Pipeline;
  run: PipelineRun;
  failedJobs: Job[];
  failedStages: Stage[];
  jobs: Job[];
}): Promise<RunRcaOutput> {
  const rawLogs = [input.run.logsText, ...input.jobs.map((job) => `${job.name}: ${job.logs}`)].filter(Boolean).join("\n\n");
  if (!rawLogs.trim()) {
    return {
      summary: "Insufficient log context.",
      rootCause: "Insufficient log context.",
      failureCategory: "unknown",
      confidence: "low",
      evidence: [],
      suggestedFixes: ["Re-run with verbose logging enabled."],
      riskImpact: "Unknown",
      nextSteps: ["Collect pipeline, stage, and job logs before generating RCA."]
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      summary: "Insufficient log context.",
      rootCause: "Insufficient log context.",
      failureCategory: "unknown",
      confidence: "low",
      evidence: [],
      suggestedFixes: ["Set OPENAI_API_KEY to enable AI RCA generation."],
      riskImpact: "Unknown",
      nextSteps: ["Configure an AI API key and rerun RCA."]
    };
  }

  const prompt = `You are an SRE RCA assistant. Output JSON only.
Schema: {"summary":string,"rootCause":string,"failureCategory":"dependency"|"test"|"build"|"deployment"|"infra"|"auth"|"unknown","confidence":"low"|"medium"|"high","evidence":string[],"suggestedFixes":string[],"riskImpact":string,"nextSteps":string[]}
Rules:
- Base claims only on provided logs/context.
- If evidence is weak, use "Insufficient log context." and confidence "low".

Context:
pipeline=${input.pipeline.name}
repo=${input.pipeline.repo}
branch=${input.pipeline.branch}
status=${input.run.status}
durationSec=${input.run.duration}
startedAt=${input.run.startedAt.toISOString()}
endedAt=${input.run.endedAt?.toISOString() ?? "n/a"}
failedJobs=${input.failedJobs.map((j) => j.name).join(", ") || "none"}
failedStages=${input.failedStages.map((s) => s.name).join(", ") || "none"}

Logs:
${rawLogs.slice(0, 20000)}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.RAVAH_RCA_MODEL ?? "gpt-4.1-mini",
      input: prompt,
      max_output_tokens: 700
    })
  });

  if (!response.ok) throw new Error("AI analysis request failed");
  const body = (await response.json()) as { output_text?: string };
  const parsed = safeJsonParse(body.output_text ?? "");
  if (!parsed) throw new Error("AI analysis returned invalid JSON");
  return parsed;
}
