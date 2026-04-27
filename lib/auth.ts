import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GitHubProvider from "next-auth/providers/github";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";
import { getAuthEnv } from "@/lib/env";

const authEnv = getAuthEnv();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    GitHubProvider({
      clientId: authEnv.githubClientId,
      clientSecret: authEnv.githubClientSecret
    })
  ],
  callbacks: {
    async signIn() {
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.name = user.name;
        session.user.email = user.email;
        session.user.image = user.image;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const resolved = new URL(url);
        if (resolved.origin === baseUrl) {
          return url;
        }
      } catch {
        // fall through to baseUrl/dashboard
      }

      return `${baseUrl}/dashboard`;
    }
  },
  events: {
    async signIn({ user, account }) {
      // Run org bootstrap after adapter user/account persistence to avoid
      // update-on-missing-user failures in OAuth callback flow.
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
    }
  },
  pages: {
    signIn: "/login"
  },
  secret: authEnv.nextAuthSecret
};
