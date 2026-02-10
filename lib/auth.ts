import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GitHubProvider from "next-auth/providers/github";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? ""
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return true;

      if (account?.provider === "github" && account.providerAccountId) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            githubId: account.providerAccountId,
            avatarUrl: user.image ?? undefined
          }
        });
      }

      const existingMembership = await prisma.membership.findFirst({
        where: { userId: user.id },
        include: { org: true }
      });

      if (!existingMembership) {
        const org = await prisma.organization.create({
          data: {
            name: user.name ? `${user.name}'s Org` : "Personal Org",
            slug: `org-${user.id.slice(0, 8)}`
          }
        });

        await prisma.membership.create({
          data: {
            userId: user.id,
            orgId: org.id,
            role: "owner"
          }
        });

        const project = await prisma.project.create({
          data: {
            orgId: org.id,
            name: "Connected Repo",
            repoOwner: "owner",
            repoName: "repo"
          }
        });

        await prisma.integrationGithub.create({
          data: {
            orgId: org.id,
            projectId: project.id,
            type: "oauth",
            accessTokenEncrypted: account?.access_token ?? null
          }
        });
      }

      return true;
    }
  },
  pages: {
    signIn: "/login"
  },
  secret: process.env.NEXTAUTH_SECRET
};
