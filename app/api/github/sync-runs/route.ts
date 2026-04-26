import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRequestContext } from "@/lib/context";
import { syncGithubWorkflowRunsForUser } from "@/lib/github-sync";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const context = await getRequestContext();
  if (!context) {
    return NextResponse.json({ message: "Organization context not found" }, { status: 404 });
  }

  if (context.demoMode) {
    return NextResponse.json({ message: "Sync skipped in demo mode", summary: null }, { status: 200 });
  }

  try {
    const summary = await syncGithubWorkflowRunsForUser({
      userEmail: session.user.email,
      orgId: context.orgId
    });

    return NextResponse.json({ message: "Sync completed", summary });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
