export type GeneratedInsight = {
  rootCause: string;
  confidence: "High" | "Med" | "Low";
  suggestedFix: string[];
  riskImpact: "Low" | "Med" | "High";
  relatedChange: string;
};

export function analyzeLogs(logText: string): GeneratedInsight {
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
      rootCause: "Health check or configuration issue",
      confidence: "Med",
      suggestedFix: [
        "Review recent health check changes",
        "Validate configuration for the service",
        "Redeploy with corrected settings"
      ],
      riskImpact: "Med",
      relatedChange: "Investigate recent deployment changes"
    };
  }

  if (normalized.includes("timeout")) {
    return {
      rootCause: "Dependency or network response timeout",
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

  return {
    rootCause: "Unknown failure pattern detected",
    confidence: "Low",
    suggestedFix: ["Review logs for additional context", "Escalate to service owner"],
    riskImpact: "Low",
    relatedChange: "No related change detected"
  };
}
