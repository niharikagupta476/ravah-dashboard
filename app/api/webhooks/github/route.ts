import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyGithubSignature } from "@/lib/github-webhook";
import { requireEnv } from "@/lib/env";
import { analyzeLogs } from "@/lib/analyze-logs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(key: string) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");
  const delivery = request.headers.get("x-github-delivery") ?? "unknown";

  if (!checkRateLimit(delivery)) {
    return NextResponse.json({ message: "Rate limit exceeded" }, { status: 429 });
  }

  const rawBody = await request.text();
  let secret = "";
  try {
    secret = requireEnv("GITHUB_WEBHOOK_SECRET");
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 500 });
  }

  if (!verifyGithubSignature(rawBody, signature, secret)) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  if (event !== "workflow_run") {
    return NextResponse.json({ message: "Ignored" }, { status: 200 });
  }

  const payload = JSON.parse(rawBody) as {
    action: string;
    workflow_run: {
      id: number;
      name: string;
      conclusion: string | null;
      status: string;
      created_at: string;
      updated_at: string;
      repository: { full_name: string };
      head_sha: string;
    };
    installation?: { id: number };
    repository: { full_name: string; owner: { login: string }; name: string };
  };

  if (payload.action !== "completed") {
    return NextResponse.json({ message: "Ignored" }, { status: 200 });
  }

  const installationId = payload.installation?.id?.toString();
  const repoOwner = payload.repository.owner.login;
  const repoName = payload.repository.name;

  if (!installationId) {
    return NextResponse.json({ message: "Missing installationId" }, { status: 400 });
  }

  const integration = await prisma.integrationGithub.findFirst({
    where: { installationId }
  });

  if (!integration) {
    return NextResponse.json({ message: "Integration not found" }, { status: 404 });
  }

  const project =
    integration.projectId
      ? await prisma.project.findUnique({ where: { id: integration.projectId } })
      : await prisma.project.findFirst({
          where: { orgId: integration.orgId, repoOwner, repoName }
        });

  const activeProject =
    project ??
    (await prisma.project.create({
      data: {
        orgId: integration.orgId,
        name: `${repoOwner}/${repoName}`,
        repoOwner,
        repoName
      }
    }));

  const pipeline = await prisma.pipeline.upsert({
    where: {
      id: `${activeProject.id}-${payload.workflow_run.name}`
    },
    update: {
      status: payload.workflow_run.conclusion?.toUpperCase() ?? "UNKNOWN",
      lastRunAt: new Date(payload.workflow_run.updated_at),
      durationSec: 300
    },
    create: {
      id: `${activeProject.id}-${payload.workflow_run.name}`,
      orgId: integration.orgId,
      projectId: activeProject.id,
      name: payload.workflow_run.name,
      service: payload.workflow_run.name,
      env: "Prod",
      status: payload.workflow_run.conclusion?.toUpperCase() ?? "UNKNOWN",
      lastRunAt: new Date(payload.workflow_run.updated_at),
      durationSec: 300,
      owner: repoOwner
    }
  });

  const runStatus = payload.workflow_run.conclusion?.toUpperCase() ?? "UNKNOWN";
  const logsText = `workflow_run ${payload.workflow_run.name} concluded with ${runStatus} for ${repoOwner}/${repoName}`;

  const run = await prisma.pipelineRun.create({
    data: {
      pipelineId: pipeline.id,
      orgId: integration.orgId,
      projectId: activeProject.id,
      status: runStatus,
      startedAt: new Date(payload.workflow_run.created_at),
      endedAt: new Date(payload.workflow_run.updated_at),
      logsText,
      stages: {
        createMany: {
          data: [
            { name: "Build", status: runStatus === "SUCCESS" ? "SUCCESS" : "FAILED", orgId: integration.orgId, projectId: activeProject.id },
            { name: "Tests", status: runStatus === "SUCCESS" ? "SUCCESS" : "FAILED", orgId: integration.orgId, projectId: activeProject.id },
            { name: "Deploy", status: runStatus === "SUCCESS" ? "SUCCESS" : "FAILED", orgId: integration.orgId, projectId: activeProject.id }
          ]
        }
      }
    }
  });

  await prisma.activity.create({
    data: {
      message: `GitHub Actions run ${runStatus.toLowerCase()}: ${payload.workflow_run.name}`,
      entityType: "pipeline",
      entityId: pipeline.id,
      orgId: integration.orgId,
      projectId: activeProject.id
    }
  });

  if (runStatus !== "SUCCESS") {
    const generated = analyzeLogs(logsText);
    await prisma.insight.create({
      data: {
        entityType: "pipelineRun",
        entityId: run.id,
        orgId: integration.orgId,
        projectId: activeProject.id,
        rootCause: generated.rootCause,
        confidence: generated.confidence,
        suggestedFixJson: JSON.stringify(generated.suggestedFix),
        riskImpact: generated.riskImpact,
        relatedChange: payload.workflow_run.head_sha
      }
    });
  }

  return NextResponse.json({ message: "Ingested" });
}
