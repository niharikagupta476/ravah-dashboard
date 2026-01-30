import { prisma } from "../lib/prisma";

async function main() {
  await prisma.activity.deleteMany();
  await prisma.insight.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.pipelineRun.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.alertInstance.deleteMany();
  await prisma.alertGroup.deleteMany();
  await prisma.incidentEvent.deleteMany();
  await prisma.incident.deleteMany();

  const paymentsPipeline = await prisma.pipeline.create({
    data: {
      name: "payments-service-prod",
      service: "payments-service",
      env: "Prod",
      status: "FAILED",
      lastRunAt: new Date(Date.now() - 1000 * 60 * 12),
      durationSec: 780,
      owner: "Sasha"
    }
  });

  const userPipeline = await prisma.pipeline.create({
    data: {
      name: "user-service-prod",
      service: "user-service",
      env: "Prod",
      status: "SUCCESS",
      lastRunAt: new Date(Date.now() - 1000 * 60 * 45),
      durationSec: 520,
      owner: "Mina"
    }
  });

  const failedRun = await prisma.pipelineRun.create({
    data: {
      pipelineId: paymentsPipeline.id,
      status: "FAILED",
      startedAt: new Date(Date.now() - 1000 * 60 * 20),
      endedAt: new Date(Date.now() - 1000 * 60 * 7),
      logsText:
        "Deploy step failed with ImagePullBackOff. Image tag not found in registry (ECR).",
      stages: {
        createMany: {
          data: [
            { name: "Build", status: "SUCCESS" },
            { name: "Test", status: "SUCCESS" },
            {
              name: "Deploy",
              status: "FAILED",
              errorCode: "ImagePullBackOff",
              errorMessage: "Image tag not found in registry (ECR)"
            }
          ]
        }
      }
    }
  });

  await prisma.pipelineRun.create({
    data: {
      pipelineId: userPipeline.id,
      status: "SUCCESS",
      startedAt: new Date(Date.now() - 1000 * 60 * 50),
      endedAt: new Date(Date.now() - 1000 * 60 * 42),
      logsText: "Pipeline completed successfully.",
      stages: {
        createMany: {
          data: [
            { name: "Build", status: "SUCCESS" },
            { name: "Test", status: "SUCCESS" },
            { name: "Deploy", status: "SUCCESS" }
          ]
        }
      }
    }
  });

  await prisma.insight.create({
    data: {
      entityType: "pipelineRun",
      entityId: failedRun.id,
      rootCause: "Image tag not found in registry (ECR)",
      confidence: "High",
      suggestedFixJson: JSON.stringify([
        "Verify image tag exists",
        "Update deployment manifest tag",
        "Retry deploy"
      ]),
      riskImpact: "Low",
      relatedChange: "PR #1842: bump payments image"
    }
  });

  await prisma.activity.createMany({
    data: [
      {
        message: "Pipeline failed: payments-service-prod deploy stage",
        entityType: "pipelineRun",
        entityId: failedRun.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 6)
      },
      {
        message: "Pipeline succeeded: user-service-prod",
        entityType: "pipeline",
        entityId: userPipeline.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 40)
      }
    ]
  });

  const alertGroup = await prisma.alertGroup.create({
    data: {
      name: "Payment latency spike",
      service: "payments",
      env: "Prod",
      severity: "critical",
      count: 8,
      lastSeenAt: new Date(Date.now() - 1000 * 60 * 4),
      status: "open",
      instances: {
        createMany: {
          data: [
            {
              timestamp: new Date(Date.now() - 1000 * 60 * 4),
              message: "p95 latency above 900ms",
              fingerprint: "latency-1"
            }
          ]
        }
      }
    }
  });

  await prisma.insight.create({
    data: {
      entityType: "alertGroup",
      entityId: alertGroup.id,
      rootCause: "Traffic spike from partner batch window",
      confidence: "Med",
      suggestedFixJson: JSON.stringify([
        "Adjust autoscaler target to 65% CPU",
        "Coordinate batch windows with partners"
      ]),
      riskImpact: "Med",
      relatedChange: "Capacity review scheduled"
    }
  });

  const incident = await prisma.incident.create({
    data: {
      title: "Checkout degradation",
      env: "Prod",
      severity: "sev-1",
      status: "mitigated",
      startedAt: new Date(Date.now() - 1000 * 60 * 180),
      resolvedAt: null,
      owner: "Sasha",
      events: {
        createMany: {
          data: [
            {
              timestamp: new Date(Date.now() - 1000 * 60 * 160),
              type: "detect",
              message: "Spike in error rate detected"
            }
          ]
        }
      }
    }
  });

  await prisma.insight.create({
    data: {
      entityType: "incident",
      entityId: incident.id,
      rootCause: "Primary database connection pool exhausted during peak checkout",
      confidence: "High",
      suggestedFixJson: JSON.stringify([
        "Increase connection pool limit",
        "Add circuit breaker for checkout service",
        "Update runbook for traffic shift"
      ]),
      riskImpact: "High",
      relatedChange: "Incident review scheduled"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
