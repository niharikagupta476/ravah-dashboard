import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const githubRepoSchema = z.object({
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  default_branch: z.string(),
  updated_at: z.string(),
  html_url: z.string()
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { email: session.user.email },
    include: {
      accounts: true,
      memberships: {
        include: {
          org: {
            include: {
              projects: {
                orderBy: { createdAt: "desc" }
              }
            }
          }
        }
      }
    }
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const githubAccount = user.accounts.find((account) => account.provider === "github");
  const organization = user.memberships[0]?.org ?? null;

  if (!githubAccount?.access_token) {
    return NextResponse.json(
      {
        message: "GitHub access token missing. Reconnect GitHub.",
        code: "MISSING_TOKEN",
        github: {
          provider: githubAccount?.provider ?? "github",
          hasToken: false,
          login: session.user.email,
          image: session.user.image
        },
        organization,
        projects: organization?.projects ?? [],
        repos: []
      },
      { status: 400 }
    );
  }

  const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubAccount.access_token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const errorMessage = await response.text();
    return NextResponse.json(
      {
        message: "GitHub API request failed",
        details: errorMessage.slice(0, 250)
      },
      { status: response.status }
    );
  }

  const reposRaw = await response.json();
  const repos = z.array(githubRepoSchema).parse(reposRaw);

  const connected = new Set((organization?.projects ?? []).map((project) => `${project.repoOwner}/${project.repoName}`));

  return NextResponse.json({
    github: {
      provider: githubAccount.provider,
      hasToken: true,
      login: session.user.email,
      name: session.user.name,
      image: session.user.image
    },
    organization: organization
      ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug
        }
      : null,
    projects: (organization?.projects ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      full_name: `${project.repoOwner}/${project.repoName}`,
      default_branch: "main",
      createdAt: project.createdAt
    })),
    repos: repos.map((repo) => ({
      ...repo,
      connected: connected.has(repo.full_name)
    }))
  });
}
