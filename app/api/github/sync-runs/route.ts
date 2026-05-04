import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getRequestContext } from "@/lib/context";
import { createSamplePipelineData, syncGithubWorkflowRunsForRepo } from "@/lib/github-sync";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  owner: z.string(),
  repo: z.string(),
  fullName: z.string(),
  projectId: z.string(),
  defaultBranch: z.string().optional(),
  createSample: z.boolean().optional()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const context = await getRequestContext();
  if (!context) {
    return NextResponse.json({ message: "Organization context not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid sync payload" }, { status: 400 });
  }

  const payload = parsed.data;
  await prisma.user.findFirst({ where: { email: session.user.email } });

  if (context.demoMode) {
    return NextResponse.json({ message: "Sync skipped in demo mode", summary: null }, { status: 200 });
  }

  try {
    const summary = payload.createSample && process.env.NODE_ENV === "development"
      ? await createSamplePipelineData({
          userEmail: session.user.email,
          orgId: context.orgId,
          projectId: payload.projectId,
          owner: payload.owner,
          repo: payload.repo,
          fullName: payload.fullName,
          defaultBranch: payload.defaultBranch
        })
      : await syncGithubWorkflowRunsForRepo({
          userEmail: session.user.email,
          orgId: context.orgId,
          projectId: payload.projectId,
          owner: payload.owner,
          repo: payload.repo,
          fullName: payload.fullName,
          defaultBranch: payload.defaultBranch
        });

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
