import { prisma } from "@/lib/prisma";
import { analyzeLogs } from "@/lib/analyze-logs";

type SyncRepoInput = {
  userEmail: string;
  orgId: string;
  projectId: string;
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch?: string;
};

type SyncResult = {
  ok: boolean;
  synced: boolean;
  repo: string;
  reason?: string;
  workflowsFetched: number;
  runsFetched: number;
  pipelinesUpserted: number;
  runsUpserted: number;
  jobsUpserted: number;
  stagesUpserted: number;
};

function normalizeStatus(status: string | null, conclusion: string | null) {
  const source = conclusion ?? status ?? "unknown";
  return source.toUpperCase();
}

function durationInSeconds(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return 0;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  return Math.round((endMs - startMs) / 1000);
}

export async function createSamplePipelineData(input: SyncRepoInput): Promise<SyncResult> {
  const now = new Date();
  const startedAt = new Date(now.getTime() - 1000 * 60 * 8);
  const endedAt = new Date(now.getTime() - 1000 * 60 * 2);

  const samplePipelineName = `${input.repo}-workflow`;
  const existingPipeline = await prisma.pipeline.findFirst({
    where: {
      orgId: input.orgId,
      projectId: input.projectId,
      provider: "github-actions",
      repo: input.fullName,
      name: samplePipelineName
    }
  });

  const pipeline = existingPipeline
    ? await prisma.pipeline.update({
        where: { id: existingPipeline.id },
        data: {
          status: "FAILED",
          lastRunAt: endedAt,
          durationSec: 360
        }
      })
    : await prisma.pipeline.create({
        data: {
          orgId: input.orgId,
          projectId: input.projectId,
          name: samplePipelineName,
          service: input.repo,
          provider: "github-actions",
          repo: input.fullName,
          branch: input.defaultBranch ?? "main",
          env: "prod",
          status: "FAILED",
          lastRunAt: endedAt,
          durationSec: 360,
          owner: input.owner
        }
      });

  const run = await prisma.pipelineRun.create({
    data: {
      pipelineId: pipeline.id,
      githubRunId: `sample-run-${Date.now()}`,
      orgId: input.orgId,
      projectId: input.projectId,
      status: "FAILED",
      startedAt,
      endedAt,
      duration: 360,
      logsText: `Sample run for ${input.fullName}: tests failed with timeout.`
    }
  });

  await prisma.job.createMany({
    data: [
      {
        githubJobId: `sample-job-build-${run.id}`,
        pipelineRunId: run.id,
        orgId: input.orgId,
        projectId: input.projectId,
        name: "build",
        status: "SUCCESS",
        logs: "Build completed successfully.",
        duration: 120
      },
      {
        githubJobId: `sample-job-test-${run.id}`,
        pipelineRunId: run.id,
        orgId: input.orgId,
        projectId: input.projectId,
        name: "test",
        status: "FAILED",
        logs: "Integration tests timed out.",
        duration: 240
      }
    ]
  });

  await prisma.stage.createMany({
    data: [
      {
        pipelineRunId: run.id,
        orgId: input.orgId,
        projectId: input.projectId,
        name: "build",
        status: "SUCCESS",
        duration: 120
      },
      {
        pipelineRunId: run.id,
        orgId: input.orgId,
        projectId: input.projectId,
        name: "test",
        status: "FAILED",
        duration: 240,
        errorCode: "Timeout",
        errorMessage: "Integration tests timed out"
      }
    ]
  });

  const generated = analyzeLogs("timeout in integration tests");
  await prisma.insight.create({
    data: {
      entityType: "pipelineRun",
      entityId: run.id,
      orgId: input.orgId,
      projectId: input.projectId,
      rootCause: generated.rootCause,
      confidence: generated.confidence,
      suggestedFixJson: JSON.stringify(generated.suggestedFix),
      riskImpact: generated.riskImpact,
      relatedChange: "sample"
    }
  });

  return {
    ok: true,
    synced: true,
    repo: input.fullName,
    workflowsFetched: 1,
    runsFetched: 1,
    pipelinesUpserted: 1,
    runsUpserted: 1,
    jobsUpserted: 2,
    stagesUpserted: 2
  };
}

export async function syncGithubWorkflowRunsForRepo(input: SyncRepoInput): Promise<SyncResult> {
  const user = await prisma.user.findFirst({
    where: { email: input.userEmail },
    include: {
      accounts: true,
      memberships: true
    }
  });

  if (!user) {
    throw new Error("User not found");
  }

  const githubAccount = user.accounts.find((account) => account.provider === "github");
  if (!githubAccount?.access_token) {
    throw new Error("GitHub token missing");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: input.projectId,
      orgId: input.orgId,
      repoOwner: input.owner,
      repoName: input.repo
    }
  });

  if (!project) {
    throw new Error("Project not found for provided repo/projectId");
  }

  console.info("[sync-runs] start", {
    userId: user.id,
    orgId: input.orgId,
    projectId: input.projectId,
    repo: input.fullName
  });

  const runsUrl = `https://api.github.com/repos/${input.owner}/${input.repo}/actions/runs?per_page=20`;
  console.info("[sync-runs] github runs url", runsUrl);

  const runsResponse = await fetch(runsUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubAccount.access_token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    cache: "no-store"
  });

  if (!runsResponse.ok) {
    const details = await runsResponse.text();
    throw new Error(`GitHub workflow runs fetch failed: ${details.slice(0, 200)}`);
  }

  const payload = (await runsResponse.json()) as {
    workflow_runs: Array<{
      id: number;
      name: string;
      workflow_id?: number;
      status: string;
      conclusion: string | null;
      created_at: string;
      run_started_at?: string;
      updated_at: string;
      head_branch: string | null;
      head_sha: string;
      html_url: string;
    }>;
  };

  const workflowRuns = payload.workflow_runs ?? [];
  console.info("[sync-runs] workflow run count", workflowRuns.length);

  if (workflowRuns.length === 0) {
    return {
      ok: true,
      synced: false,
      repo: input.fullName,
      reason: "No GitHub Actions workflow runs found for this repository",
      workflowsFetched: 0,
      runsFetched: 0,
      pipelinesUpserted: 0,
      runsUpserted: 0,
      jobsUpserted: 0,
      stagesUpserted: 0
    };
  }

  const workflowNameSet = new Set<string>();
  let pipelinesUpserted = 0;
  let runsUpserted = 0;
  let jobsUpserted = 0;
  let stagesUpserted = 0;

  for (const run of workflowRuns) {
    workflowNameSet.add(run.name);

    const startedAt = run.run_started_at ?? run.created_at;
    const endedAt = run.updated_at;
    const duration = durationInSeconds(startedAt, endedAt);
    const normalizedStatus = normalizeStatus(run.status, run.conclusion);

    const existingPipeline = await prisma.pipeline.findFirst({
      where: {
        orgId: input.orgId,
        projectId: input.projectId,
        provider: "github-actions",
        repo: input.fullName,
        name: run.name
      }
    });

    const pipeline = existingPipeline
      ? await prisma.pipeline.update({
          where: { id: existingPipeline.id },
          data: {
            status: normalizedStatus,
            lastRunAt: new Date(startedAt),
            durationSec: duration,
            branch: run.head_branch ?? input.defaultBranch ?? "main",
            repo: input.fullName,
            provider: "github-actions",
            env: "prod"
          }
        })
      : await prisma.pipeline.create({
          data: {
            orgId: input.orgId,
            projectId: input.projectId,
            name: run.name,
            service: run.name,
            provider: "github-actions",
            repo: input.fullName,
            branch: run.head_branch ?? input.defaultBranch ?? "main",
            env: "prod",
            status: normalizedStatus,
            lastRunAt: new Date(startedAt),
            durationSec: duration,
            owner: input.owner
          }
        });
    pipelinesUpserted += 1;

    const runRecord = await prisma.pipelineRun.upsert({
      where: { githubRunId: String(run.id) },
      update: {
        pipelineId: pipeline.id,
        orgId: input.orgId,
        projectId: input.projectId,
        status: normalizedStatus,
        startedAt: new Date(startedAt),
        endedAt: new Date(endedAt),
        duration,
        logsText: `Workflow run ${run.name} (${normalizedStatus}) ${run.html_url}`
      },
      create: {
        githubRunId: String(run.id),
        pipelineId: pipeline.id,
        orgId: input.orgId,
        projectId: input.projectId,
        status: normalizedStatus,
        startedAt: new Date(startedAt),
        endedAt: new Date(endedAt),
        duration,
        logsText: `Workflow run ${run.name} (${normalizedStatus}) ${run.html_url}`
      }
    });
    runsUpserted += 1;

    const jobsUrl = `https://api.github.com/repos/${input.owner}/${input.repo}/actions/runs/${run.id}/jobs`;
    console.info("[sync-runs] jobs url", jobsUrl);

    const jobsResponse = await fetch(jobsUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubAccount.access_token}`,
        "X-GitHub-Api-Version": "2022-11-28"
      },
      cache: "no-store"
    });

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

    const jobs = jobsPayload.jobs ?? [];
    console.info("[sync-runs] job count", { runId: run.id, count: jobs.length });

    await prisma.job.deleteMany({ where: { pipelineRunId: runRecord.id } });
    await prisma.stage.deleteMany({ where: { pipelineRunId: runRecord.id } });

    for (const job of jobs) {
      const jobStatus = normalizeStatus(job.status, job.conclusion);
      const jobDuration = durationInSeconds(job.started_at, job.completed_at ?? run.updated_at);

      await prisma.job.upsert({
        where: { githubJobId: String(job.id) },
        update: {
          pipelineRunId: runRecord.id,
          orgId: input.orgId,
          projectId: input.projectId,
          name: job.name,
          status: jobStatus,
          logs: `GitHub job ${job.name} (${jobStatus}) ${job.html_url}`,
          duration: jobDuration
        },
        create: {
          githubJobId: String(job.id),
          pipelineRunId: runRecord.id,
          orgId: input.orgId,
          projectId: input.projectId,
          name: job.name,
          status: jobStatus,
          logs: `GitHub job ${job.name} (${jobStatus}) ${job.html_url}`,
          duration: jobDuration
        }
      });
      jobsUpserted += 1;

      await prisma.stage.create({
        data: {
          pipelineRunId: runRecord.id,
          orgId: input.orgId,
          projectId: input.projectId,
          name: job.name,
          status: jobStatus,
          duration: jobDuration,
          errorCode: jobStatus === "SUCCESS" ? null : "GitHubJobFailure",
          errorMessage: jobStatus === "SUCCESS" ? null : `Job ${job.name} failed`
        }
      });
      stagesUpserted += 1;
    }
  }

  console.info("[sync-runs] prisma upsert counts", {
    pipelinesUpserted,
    runsUpserted,
    jobsUpserted,
    stagesUpserted
  });

  return {
    ok: true,
    synced: true,
    repo: input.fullName,
    workflowsFetched: workflowNameSet.size,
    runsFetched: workflowRuns.length,
    pipelinesUpserted,
    runsUpserted,
    jobsUpserted,
    stagesUpserted
  };
}
