export type GeneratedInsight = {
  rootCause: string;
  confidence: "High" | "Med" | "Low";
  suggestedFix: string[];
  riskImpact: "Low" | "Med" | "High";
  relatedChange: string;
};

export function analyzeLogs(logText: string): GeneratedInsight | null {
  const normalized = logText.toLowerCase();

  if (normalized.includes("imagepullbackoff")) {
    return {
      rootCause: "Image tag not found in registry (ECR)",
      confidence: "High",
      suggestedFix: [
        "Verify image tag exists",
        "Update deployment manifest tag",
        "Retry deploy"
      ],
      riskImpact: "Low",
      relatedChange: "PR #1842: bump payments image"
    };
  }

  if (normalized.includes("crashloopbackoff")) {
    return {
      rootCause: "Health check failure causing crash loop",
      confidence: "Med",
      suggestedFix: [
        "Review recent health check changes",
        "Adjust readiness probe thresholds",
        "Redeploy with corrected probe settings"
      ],
      riskImpact: "Med",
      relatedChange: "Investigate recent deployment changes"
    };
  }

  if (normalized.includes("timeout")) {
    return {
      rootCause: "Network or dependency response timeout",
      confidence: "Med",
      suggestedFix: [
        "Check downstream dependency latency",
        "Increase timeout thresholds",
        "Retry deploy after dependency stabilizes"
      ],
      riskImpact: "Med",
      relatedChange: "Review dependency performance updates"
    };
  }

  return null;
}
