import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  full_name: z.string().min(1),
  default_branch: z.string().min(1)
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
    include: {
      accounts: true,
      memberships: true
    }
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const githubAccount = user.accounts.find((account) => account.provider === "github");
  if (!githubAccount?.access_token) {
    return NextResponse.json(
      { message: "GitHub access token missing. Reconnect GitHub.", code: "MISSING_TOKEN" },
      { status: 400 }
    );
  }

  const { owner, name, default_branch } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    let membership = user.memberships[0];
    if (!membership) {
      const org = await tx.organization.create({
        data: {
          name: user.name ? `${user.name}'s Org` : "Personal Org",
          slug: `org-${user.id.slice(0, 8)}`
        }
      });

      membership = await tx.membership.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: "owner"
        }
      });
    }

    const orgId = membership.orgId;

    let project = await tx.project.findFirst({
      where: {
        orgId,
        repoOwner: owner,
        repoName: name
      }
    });

    if (!project) {
      project = await tx.project.create({
        data: {
          orgId,
          name: `${owner}/${name}`,
          repoOwner: owner,
          repoName: name
        }
      });
    }

    const existingIntegration = await tx.integrationGithub.findFirst({
      where: {
        orgId,
        projectId: project.id,
        type: "oauth"
      }
    });

    if (existingIntegration) {
      await tx.integrationGithub.update({
        where: { id: existingIntegration.id },
        data: {
          accessTokenEncrypted: githubAccount.access_token
        }
      });
    } else {
      await tx.integrationGithub.create({
        data: {
          orgId,
          projectId: project.id,
          type: "oauth",
          accessTokenEncrypted: githubAccount.access_token
        }
      });
    }

    return {
      id: project.id,
      name: project.name,
      full_name: `${project.repoOwner}/${project.repoName}`,
      default_branch
    };
  });

  return NextResponse.json({ message: "Repository connected", project: result });
}
