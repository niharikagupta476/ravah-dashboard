import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  projectId: z.string().min(1)
});

/**
 * POST /api/github/disconnect-repo
 *
 * Soft-deletes a connected repository by setting Project.isActive = false.
 * Historical pipeline data (PipelineRun, Stage, Job) is preserved.
 * Future sync-runs calls skip inactive projects.
 */
export async function POST(request: Request) {
  // Validate authenticated session
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { projectId } = parsed.data;

  // Look up the user so we can verify org membership (prevents cross-user tampering)
  const user = await prisma.user.findFirst({
    where: { email: session.user.email },
    include: { memberships: true }
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const orgIds = user.memberships.map((m) => m.orgId);

  // Ensure the project belongs to one of the user's orgs
  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: { in: orgIds } }
  });

  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  if (!project.isActive) {
    // Already disconnected — idempotent response
    return NextResponse.json({ message: "Repository already disconnected" });
  }

  // Soft-delete: mark project inactive to stop future syncs.
  // Pipelines and historical runs are intentionally NOT deleted.
  await prisma.project.update({
    where: { id: projectId },
    data: { isActive: false }
  });

  return NextResponse.json({ message: "Repository disconnected", projectId });
}
