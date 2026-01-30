import { prisma } from "../lib/prisma";

async function main() {
  await prisma.insight.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.pipelineRun.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.alertInstance.deleteMany();
  await prisma.alertGroup.deleteMany();
  await prisma.incidentEvent.deleteMany();
  await prisma.incident.deleteMany();

  const pipelines = await prisma.pipeline.createMany({
    data: [
      {
        name: "Payments API",
        owner: "Sasha",
        env: "Prod",
        lastRunStatus: "failed",
        lastRunDurationSec: 740
      },
      {
        name: "Web Storefront",
        owner: "Mina",
        env: "Prod",
        lastRunStatus: "success",
        lastRunDurationSec: 612
      },
      {
        name: "Identity Service",
        owner: "Jon",
        env: "Staging",
        lastRunStatus: "success",
        lastRunDurationSec: 480
      },
      {
        name: "Data Warehouse",
        owner: "Ravi",
        env: "Prod",
        lastRunStatus: "failed",
        lastRunDurationSec: 920
      },
      {
        name: "Notifications",
        owner: "Leo",
        env: "Staging",
        lastRunStatus: "success",
        lastRunDurationSec: 510
      },
      {
        name: "Edge Router",
        owner: "Priya",
        env: "Prod",
        lastRunStatus: "success",
        lastRunDurationSec: 330
      }
    ]
  });

  const allPipelines = await prisma.pipeline.findMany();
  const targetPipeline = allPipelines.find((pipeline) => pipeline.name === "Payments API");
  const warehousePipeline = allPipelines.find((pipeline) => pipeline.name === "Data Warehouse");

  if (!targetPipeline || !warehousePipeline) {
    throw new Error("Missing pipeline seed data");
  }

  const failedRun = await prisma.pipelineRun.create({
    data: {
      pipelineId: targetPipeline.id,
      startedAt: new Date(Date.now() - 1000 * 60 * 20),
      endedAt: new Date(Date.now() - 1000 * 60 * 8),
      status: "failed",
      durationSec: 720,
      stages: {
        createMany: {
          data: [
            {
              name: "Start",
              status: "success",
              startedAt: new Date(Date.now() - 1000 * 60 * 20),
              endedAt: new Date(Date.now() - 1000 * 60 * 19)
            },
            {
              name: "Build",
              status: "success",
              startedAt: new Date(Date.now() - 1000 * 60 * 19),
              endedAt: new Date(Date.now() - 1000 * 60 * 16)
            },
            {
              name: "Tests",
              status: "failed",
              startedAt: new Date(Date.now() - 1000 * 60 * 16),
              endedAt: new Date(Date.now() - 1000 * 60 * 12),
              errorCode: "ImagePullBackOff",
              errorSummary: "ECR tag mismatch for payments-api:release-482"
            },
            {
              name: "Deploy",
              status: "pending",
              startedAt: new Date(Date.now() - 1000 * 60 * 12)
            }
          ]
        }
      }
    }
  });

  await prisma.pipelineRun.create({
    data: {
      pipelineId: warehousePipeline.id,
      startedAt: new Date(Date.now() - 1000 * 60 * 50),
      endedAt: new Date(Date.now() - 1000 * 60 * 35),
      status: "failed",
      durationSec: 900,
      stages: {
        createMany: {
          data: [
            {
              name: "Start",
              status: "success",
              startedAt: new Date(Date.now() - 1000 * 60 * 50),
              endedAt: new Date(Date.now() - 1000 * 60 * 48)
            },
            {
              name: "Build",
              status: "failed",
              startedAt: new Date(Date.now() - 1000 * 60 * 48),
              endedAt: new Date(Date.now() - 1000 * 60 * 44),
              errorCode: "DependencyMismatch",
              errorSummary: "Warehouse ETL step pinned to deprecated driver"
            },
            {
              name: "Tests",
              status: "pending",
              startedAt: new Date(Date.now() - 1000 * 60 * 44)
            },
            {
              name: "Deploy",
              status: "pending",
              startedAt: new Date(Date.now() - 1000 * 60 * 44)
            }
          ]
        }
      }
    }
  });

  await prisma.pipelineRun.createMany({
    data: allPipelines
      .filter((pipeline) => pipeline.id !== targetPipeline.id && pipeline.id !== warehousePipeline.id)
      .map((pipeline) => ({
        pipelineId: pipeline.id,
        startedAt: new Date(Date.now() - 1000 * 60 * 90),
        endedAt: new Date(Date.now() - 1000 * 60 * 80),
        status: "success",
        durationSec: pipeline.lastRunDurationSec
      }))
  });

  await prisma.alertGroup.create({
    data: {
      name: "Payment latency spike",
      service: "payments",
      env: "Prod",
      severity: "critical",
      count: 18,
      lastSeenAt: new Date(Date.now() - 1000 * 60 * 3),
      status: "open",
      instances: {
        createMany: {
          data: Array.from({ length: 6 }).map((_, index) => ({
            timestamp: new Date(Date.now() - 1000 * 60 * (index + 1)),
            message: "p95 latency above 900ms",
            fingerprint: `latency-${index}`
          }))
        }
      }
    }
  });

  await prisma.alertGroup.create({
    data: {
      name: "Signal spike",
      service: "edge-router",
      env: "Prod",
      severity: "warning",
      count: 9,
      lastSeenAt: new Date(Date.now() - 1000 * 60 * 10),
      status: "monitoring",
      instances: {
        createMany: {
          data: Array.from({ length: 4 }).map((_, index) => ({
            timestamp: new Date(Date.now() - 1000 * 60 * (index + 5)),
            message: "unexpected ingress volume",
            fingerprint: `signal-${index}`
          }))
        }
      }
    }
  });

  await prisma.alertGroup.create({
    data: {
      name: "Cache eviction errors",
      service: "storefront",
      env: "Staging",
      severity: "low",
      count: 5,
      lastSeenAt: new Date(Date.now() - 1000 * 60 * 20),
      status: "open",
      instances: {
        createMany: {
          data: Array.from({ length: 3 }).map((_, index) => ({
            timestamp: new Date(Date.now() - 1000 * 60 * (index + 11)),
            message: "cache eviction retry",
            fingerprint: `cache-${index}`
          }))
        }
      }
    }
  });

  const incident = await prisma.incident.create({
    data: {
      title: "Checkout degradation",
      env: "Prod",
      severity: "sev-1",
      status: "mitigated",
      startedAt: new Date(Date.now() - 1000 * 60 * 120),
      resolvedAt: null,
      owner: "Sasha",
      events: {
        createMany: {
          data: [
            {
              timestamp: new Date(Date.now() - 1000 * 60 * 110),
              type: "detect",
              message: "Spike in error rate detected"
            },
            {
              timestamp: new Date(Date.now() - 1000 * 60 * 95),
              type: "mitigate",
              message: "Traffic shifted to secondary cluster"
            },
            {
              timestamp: new Date(Date.now() - 1000 * 60 * 80),
              type: "update",
              message: "Database connection limits adjusted"
            }
          ]
        }
      }
    }
  });

  const incidentTwo = await prisma.incident.create({
    data: {
      title: "Warehouse backfill delay",
      env: "Staging",
      severity: "sev-2",
      status: "open",
      startedAt: new Date(Date.now() - 1000 * 60 * 240),
      resolvedAt: null,
      owner: "Ravi",
      events: {
        createMany: {
          data: [
            {
              timestamp: new Date(Date.now() - 1000 * 60 * 220),
              type: "detect",
              message: "Batch job latency above SLA"
            },
            {
              timestamp: new Date(Date.now() - 1000 * 60 * 200),
              type: "investigate",
              message: "Team investigating dependency mismatch"
            }
          ]
        }
      }
    }
  });

  await prisma.insight.createMany({
    data: [
      {
        entityType: "pipelineRun",
        entityId: failedRun.id,
        rootCauseJson: JSON.stringify([
          "Container image tag mismatch between CI build and deploy stage",
          "ECR cache contains stale release-481 artifact"
        ]),
        confidence: "High",
        suggestedFixJson: JSON.stringify([
          "Invalidate ECR cache and redeploy release-482",
          "Pin deploy step to artifact digest"
        ]),
        riskImpact: "Low"
      },
      {
        entityType: "alertGroup",
        entityId: (await prisma.alertGroup.findFirst({ where: { name: "Signal spike" } }))!.id,
        rootCauseJson: JSON.stringify([
          "Ingress spike from partner batch window",
          "Autoscaler threshold too conservative"
        ]),
        confidence: "Med",
        suggestedFixJson: JSON.stringify([
          "Adjust autoscaler target to 65% CPU",
          "Notify partner to stagger batch window"
        ]),
        riskImpact: "Med"
      },
      {
        entityType: "incident",
        entityId: incident.id,
        rootCauseJson: JSON.stringify([
          "Primary database connection pool exhausted during peak checkout",
          "Retry storm amplified queue backlog"
        ]),
        confidence: "High",
        suggestedFixJson: JSON.stringify([
          "Increase connection pool limit and add circuit breaker",
          "Align retry budgets with service-tier limits",
          "Add synthetic checkout load test",
          "Runbook updated for traffic shift",
          "Monitoring tuned for early saturation"
        ]),
        riskImpact: "High"
      }
    ]
  });

  await prisma.insight.create({
    data: {
      entityType: "incident",
      entityId: incidentTwo.id,
      rootCauseJson: JSON.stringify([
        "Staging ETL driver out of sync with warehouse schema"
      ]),
      confidence: "Med",
      suggestedFixJson: JSON.stringify([
        "Upgrade ETL driver to latest staging schema",
        "Add schema diff check to pipeline",
        "Schedule backfill window with analytics"
      ]),
      riskImpact: "Med"
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
