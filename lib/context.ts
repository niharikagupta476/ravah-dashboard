import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getRequestContext() {
  const session = await getServerSession(authOptions);
  const demoMode = process.env.DEMO_MODE === "true" || !session?.user?.email;

  if (demoMode) {
    const demoOrg = await prisma.organization.findFirst({
      where: { slug: "demo" },
      include: { projects: true }
    });
    const demoProject = demoOrg?.projects[0];

    if (!demoOrg || !demoProject) {
      return null;
    }

    return {
      orgId: demoOrg.id,
      projectId: demoProject.id,
      orgIds: [demoOrg.id],
      projectIds: demoOrg.projects.map((project) => project.id),
      userId: null,
      demoMode: true
    };
  }

  const userEmail = session?.user?.email;
  const user = await prisma.user.findFirst({
    where: { email: userEmail ?? undefined },
    include: { memberships: true }
  });

  const orgIds = user?.memberships.map((membership) => membership.orgId) ?? [];
  if (!user || orgIds.length === 0) {
    return null;
  }

  const projects = await prisma.project.findMany({
    where: { orgId: { in: orgIds } },
    orderBy: { createdAt: "asc" }
  });
  const projectIds = projects.map((project) => project.id);

  const primaryOrgId = orgIds[0];
  const primaryProject = projects.find((project) => project.orgId === primaryOrgId) ?? projects[0];

  if (!primaryOrgId) {
    return null;
  }

  return {
    orgId: primaryOrgId,
    projectId: primaryProject?.id,
    orgIds,
    projectIds,
    userId: user.id,
    demoMode: false
  };
}
