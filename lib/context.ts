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

    return { orgId: demoOrg.id, projectId: demoProject.id, demoMode: true };
  }

  const user = await prisma.user.findFirst({
    where: { email: session.user.email ?? undefined },
    include: { memberships: { include: { org: { include: { projects: true } } } } }
  });

  const membership = user?.memberships[0];
  const project = membership?.org.projects[0];

  if (!membership || !project) {
    return null;
  }

  return { orgId: membership.orgId, projectId: project.id, demoMode: false };
}
