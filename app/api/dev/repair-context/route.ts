import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { email: session.user.email },
    include: { memberships: true }
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const summary = {
    membershipsCreated: 0,
    projectsCreated: 0,
    integrationsRepaired: 0,
    pipelinesMigrated: 0
  };

  const integrations = await prisma.integrationGithub.findMany({
    where: user.memberships.length
      ? { orgId: { in: user.memberships.map((membership) => membership.orgId) } }
      : {}
  });

  for (const integration of integrations) {
    const hasMembership = user.memberships.some((membership) => membership.orgId === integration.orgId);
    if (!hasMembership) {
      await prisma.membership.create({
        data: {
          userId: user.id,
          orgId: integration.orgId,
          role: "owner"
        }
      });
      summary.membershipsCreated += 1;
    }

    const linkedProject = integration.projectId
      ? await prisma.project.findUnique({ where: { id: integration.projectId } })
      : null;

    if (!integration.projectId || !linkedProject) {
      const fallbackProject = await prisma.project.create({
        data: {
          orgId: integration.orgId,
          name: "Recovered GitHub Project",
          repoOwner: "unknown",
          repoName: `repo-${integration.id.slice(0, 6)}`
        }
      });
      await prisma.integrationGithub.update({
        where: { id: integration.id },
        data: { projectId: fallbackProject.id }
      });
      summary.projectsCreated += 1;
      summary.integrationsRepaired += 1;
    }
  }

  const migratedOrgs = Array.from(new Set([...user.memberships.map((membership) => membership.orgId), ...integrations.map((integration) => integration.orgId)]));
  const legacyPipelines = await prisma.pipeline.findMany({
    where: {
      orgId: { in: migratedOrgs },
      OR: [{ id: { startsWith: "ghwf-" } }, { id: { startsWith: "sample-" } }]
    }
  });

  for (const legacy of legacyPipelines) {
    const replacement = await prisma.pipeline.create({
      data: {
        orgId: legacy.orgId,
        projectId: legacy.projectId,
        name: legacy.name,
        service: legacy.service,
        provider: legacy.provider,
        repo: legacy.repo,
        branch: legacy.branch,
        env: legacy.env,
        status: legacy.status,
        lastRunAt: legacy.lastRunAt,
        durationSec: legacy.durationSec,
        owner: legacy.owner
      }
    });

    await prisma.pipelineRun.updateMany({
      where: { pipelineId: legacy.id },
      data: { pipelineId: replacement.id }
    });

    await prisma.pipeline.delete({ where: { id: legacy.id } });
    summary.pipelinesMigrated += 1;
  }

  return NextResponse.json({ ok: true, summary });
}
