import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  projectId: z.string().min(1)
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { email: session.user.email },
    include: { memberships: true }
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const membershipOrgIds = user.memberships.map((membership) => membership.orgId);
  const project = await prisma.project.findFirst({
    where: {
      id: parsed.data.projectId,
      orgId: { in: membershipOrgIds }
    }
  });

  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  await prisma.integrationGithub.updateMany({
    where: { orgId: project.orgId, projectId: project.id },
    data: { projectId: null }
  });

  return NextResponse.json({ message: "Repository disconnected", projectId: project.id });
}
