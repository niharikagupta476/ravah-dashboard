import { prisma } from "@/lib/prisma";
import { analyzeLogs } from "@/lib/analyze-logs";

type SyncSummary = {
  projects: number;
  pipelinesUpserted: number;
  runsUpserted: number;
  jobsUpserted: number;
};

function normalizeRunStatus(status: string | null, conclusion: string | null) {
  if (conclusion) return conclusion.toUpperCase();
  if (status === "completed") return "UNKNOWN";
  return status?.toUpperCase() ?? "UNKNOWN";
}

function durationInSeconds(startedAt: string, endedAt: string) {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 1000);
}

export async function syncGithubWorkflowRunsForUser(params: {
  userEmail: string;
  orgId: string;
}): Promise<SyncSummary> {
  const user = await prisma.user.findFirst({
    where: { email: params.userEmail },
    include: {
      accounts: true,
      memberships: {
        where: { orgId: params.orgId },
        include: {
          org: {
            include: {
              projects: true
            }
          }
        }
      }
    }
  });

  const githubAccount = user?.accounts.find((account) => account.provider === "github");
  if (!user || !githubAccount?.access_token) {
    throw new Error("GitHub access token missing. Connect or reconnect GitHub.");
  }

  const projects = user.memberships[0]?.org.projects ?? [];
  let pipelinesUpserted = 0;
  let runsUpserted = 0;
  let jobsUpserted = 0;

  for (const project of projects) {
    const runsResponse = await fetch(
      `https://api.github.com/repos/${project.repoOwner}/${project.repoName}/actions/runs?per_page=20`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubAccount.access_token}`,
          "X-GitHub-Api-Version": "2022-11-28"
        },
        cache: "no-store"
      }
    );

    if (!runsResponse.ok) {
      continue;
    }

    const runsPayload = (await runsResponse.json()) as {
      workflow_runs: Array<{
        id: number;
        name: string;
        status: string;
        conclusion: string | null;
        created_at: string;
        updated_at: string;
        run_started_at?: string;
        html_url: string;
        head_branch: string | null;
        head_sha: string;
        workflow_id?: number;
      }>;
    };

    for (const workflowRun of runsPayload.workflow_runs ?? []) {
      const pipelineId = `ghwf-${project.id}-${workflowRun.workflow_id ?? workflowRun.name.replace(/\W+/g, "-").toLowerCase()}`;
      const runId = `ghrun-${workflowRun.id}`;
      const runStatus = normalizeRunStatus(workflowRun.status, workflowRun.conclusion);
      const startedAt = workflowRun.run_started_at ?? workflowRun.created_at;
      const endedAt = workflowRun.updated_at;
      const durationSec = durationInSeconds(startedAt, endedAt);

      await prisma.pipeline.upsert({
        where: { id: pipelineId },
        update: {
          status: runStatus,
          lastRunAt: new Date(endedAt),
          durationSec,
          branch: workflowRun.head_branch ?? "main"
        },
        create: {
          id: pipelineId,
          orgId: params.orgId,
          projectId: project.id,
          name: workflowRun.name,
          service: workflowRun.name,
          provider: "github-actions",
          repo: `${project.repoOwner}/${project.repoName}`,
          branch: workflowRun.head_branch ?? "main",
          env: "Prod",
          status: runStatus,
          lastRunAt: new Date(endedAt),
          durationSec,
          owner: project.repoOwner
        }
      });
      pipelinesUpserted += 1;

      const existingRun = await prisma.pipelineRun.findUnique({ where: { id: runId } });

      const jobsResponse = await fetch(
        `https://api.github.com/repos/${project.repoOwner}/${project.repoName}/actions/runs/${workflowRun.id}/jobs?per_page=100`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${githubAccount.access_token}`,
            "X-GitHub-Api-Version": "2022-11-28"
          },
          cache: "no-store"
        }
      );

      const jobsPayload = jobsResponse.ok
        ? ((await jobsResponse.json()) as {
            jobs: Array<{
              id: number;
              name: string;
              status: string;
              conclusion: string | null;
              started_at: string;
              completed_at: string | null;
              html_url: string;
            }>;
          })
        : { jobs: [] };

      const normalizedJobs = (jobsPayload.jobs ?? []).map((job) => {
        const normalizedStatus = normalizeRunStatus(job.status, job.conclusion);
        const jobDuration = durationInSeconds(job.started_at, job.completed_at ?? workflowRun.updated_at);
        return {
          name: job.name,
          status: normalizedStatus,
          logs: `GitHub job ${job.name} finished with ${normalizedStatus}. Details: ${job.html_url}`,
          duration: jobDuration
        };
      });

      const fallbackJobs =
        normalizedJobs.length > 0
          ? normalizedJobs
          : [
              {
                name: workflowRun.name,
                status: runStatus,
                logs: `Workflow run ${workflowRun.name} status ${runStatus}. Details: ${workflowRun.html_url}`,
                duration: durationSec
              }
            ];

      const logsText = fallbackJobs.map((job) => job.logs).join("\n");

      await prisma.pipelineRun.upsert({
        where: { id: runId },
        update: {
          status: runStatus,
          startedAt: new Date(startedAt),
          endedAt: new Date(endedAt),
          duration: durationSec,
          logsText
        },
        create: {
          id: runId,
          pipelineId,
          orgId: params.orgId,
          projectId: project.id,
          status: runStatus,
          startedAt: new Date(startedAt),
          endedAt: new Date(endedAt),
          duration: durationSec,
          logsText
        }
      });

      await prisma.job.deleteMany({ where: { pipelineRunId: runId } });
      await prisma.stage.deleteMany({ where: { pipelineRunId: runId } });

      await prisma.job.createMany({
        data: fallbackJobs.map((job) => ({
          pipelineRunId: runId,
          orgId: params.orgId,
          projectId: project.id,
          name: job.name,
          status: job.status,
          logs: job.logs,
          duration: job.duration
        }))
      });
      jobsUpserted += fallbackJobs.length;

      const stageSeed = fallbackJobs.slice(0, 6);
      await prisma.stage.createMany({
        data: stageSeed.map((job, index) => ({
          pipelineRunId: runId,
          orgId: params.orgId,
          projectId: project.id,
          name: index < 3 ? ["Build", "Tests", "Deploy"][index] ?? job.name : job.name,
          status: job.status,
          duration: job.duration,
          errorCode: job.status === "SUCCESS" ? null : "WorkflowFailure",
          errorMessage: job.status === "SUCCESS" ? null : `${job.name} failed`
        }))
      });

      if (!existingRun) {
        await prisma.activity.create({
          data: {
            orgId: params.orgId,
            projectId: project.id,
            entityType: "pipeline",
            entityId: pipelineId,
            message: `Synced GitHub workflow run ${runStatus.toLowerCase()}: ${workflowRun.name}`
          }
        });
      }

      if (runStatus !== "SUCCESS") {
        const existingInsight = await prisma.insight.findFirst({
          where: {
            entityType: "pipelineRun",
            entityId: runId,
            orgId: params.orgId,
            projectId: project.id
          }
        });

        if (!existingInsight) {
          const generated = analyzeLogs(logsText);
          await prisma.insight.create({
            data: {
              entityType: "pipelineRun",
              entityId: runId,
              orgId: params.orgId,
              projectId: project.id,
              rootCause: generated.rootCause,
              confidence: generated.confidence,
              suggestedFixJson: JSON.stringify(generated.suggestedFix),
              riskImpact: generated.riskImpact,
              relatedChange: workflowRun.head_sha
            }
          });
        }
      }

      runsUpserted += 1;
    }
  }

  return {
    projects: projects.length,
    pipelinesUpserted,
    runsUpserted,
    jobsUpserted
  };
}
