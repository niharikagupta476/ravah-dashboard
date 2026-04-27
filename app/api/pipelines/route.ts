import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getRequestContext } from "@/lib/context";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
  status: z.string().optional()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: searchParams.get("status") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query params" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const context = await getRequestContext();
  const filterStatus = parsed.data.status ?? "all";

  if (!context) {
    if (session?.user?.email) {
      const user = await prisma.user.findFirst({
        where: { email: session.user.email },
        include: { memberships: true }
      });

      const payload = {
        pipelines: [],
        setupRequired: true,
        message: "No project context found for this user. Connect a repository in Settings.",
        ...(process.env.NODE_ENV === "development"
          ? {
              debug: {
                count: 0,
                userId: user?.id ?? null,
                orgIds: user?.memberships.map((membership) => membership.orgId) ?? [],
                projectIds: [],
                filterStatus
              }
            }
          : {})
      };

      return NextResponse.json(payload, { status: 200 });
    }

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const pipelines = await prisma.pipeline.findMany({
    where: {
      orgId: { in: context.orgIds },
      ...(context.projectIds.length ? { projectId: { in: context.projectIds } } : {})
    },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 1
      }
    },
    orderBy: { lastRunAt: "desc" }
  });

  const filtered =
    filterStatus && filterStatus !== "all"
      ? pipelines.filter((pipeline) => pipeline.status.toLowerCase() === filterStatus.toLowerCase())
      : pipelines;

  const responsePipelines = filtered.map((pipeline) => ({
      id: pipeline.id,
      displayId: pipeline.id.slice(0, 8),
      externalWorkflowId: null,
      githubWorkflowId: null,
      name: pipeline.name,
      service: pipeline.service,
      provider: pipeline.provider,
      repo: pipeline.repo,
      branch: pipeline.branch,
      owner: pipeline.owner,
      env: pipeline.env,
      status: pipeline.status,
      durationSec: pipeline.durationSec,
      lastRunAt: pipeline.lastRunAt,
      lastRunStatus: pipeline.runs[0]?.status ?? pipeline.status
    }));

  if (process.env.NODE_ENV === "development") {
    const user = session?.user?.email
      ? await prisma.user.findFirst({
          where: { email: session.user.email },
          include: { memberships: true }
        })
      : null;

    const devPayload = {
      pipelines: responsePipelines,
      debug: {
        count: responsePipelines.length,
        userId: user?.id ?? null,
        orgIds: context.orgIds.length ? context.orgIds : user?.memberships.map((membership) => membership.orgId) ?? [context.orgId],
        projectIds: context.projectIds.length ? context.projectIds : Array.from(new Set(filtered.map((pipeline) => pipeline.projectId))),
        filterStatus
      }
    };

    console.info("[api/pipelines] development payload", devPayload);
    return NextResponse.json(devPayload);
  }

  return NextResponse.json(responsePipelines);
}
