"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

type Repo = {
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  updated_at: string;
  html_url: string;
  connected: boolean;
};

type GithubSettingsResponse = {
  message?: string;
  code?: string;
  github?: {
    provider: string;
    hasToken: boolean;
    login?: string | null;
    name?: string | null;
    image?: string | null;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  projects?: {
    id: string;
    name: string;
    full_name: string;
    default_branch: string;
    createdAt: string;
  }[];
  repos?: Repo[];
};

async function fetchGithubRepos(): Promise<GithubSettingsResponse> {
  const response = await fetch("/api/github/repos");
  const body = await response.json();

  if (!response.ok) {
    if (body.code === "MISSING_TOKEN") {
      return body;
    }
    throw new Error(body.message ?? "Failed to fetch repositories");
  }

  return body;
}

async function connectRepo(repo: Repo) {
  const [owner, name] = repo.full_name.split("/");
  const response = await fetch("/api/github/connect-repo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner,
      name,
      full_name: repo.full_name,
      default_branch: repo.default_branch
    })
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message ?? "Failed to connect repository");
  }

  return body;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);

  const reposQuery = useQuery({
    queryKey: ["github-repositories"],
    queryFn: fetchGithubRepos,
    retry: false
  });

  const connectMutation = useMutation({
    mutationFn: connectRepo,
    onSuccess: () => {
      setFeedback("Repository connected.");
      queryClient.invalidateQueries({ queryKey: ["github-repositories"] });
    },
    onError: (error: Error) => {
      setFeedback(error.message);
    }
  });

  const repos = reposQuery.data?.repos ?? [];
  const connectedProjects = reposQuery.data?.projects ?? [];
  const github = reposQuery.data?.github;

  const displayRepos = useMemo(() => repos.slice(0, 25), [repos]);

  return (
    <div className="container-page space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Manage account, integrations, organization, and repositories.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Account</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {github?.name ?? github?.login ?? "Signed in user"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-300">Provider: {github?.provider ?? "github"}</p>
          </div>
          <ThemeToggle />
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">GitHub Integration</h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Connection: {github?.hasToken ? "Connected" : "Reconnect GitHub"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Token status: {github?.hasToken ? "Available" : "Missing"}
            </p>
          </div>
          {!github?.hasToken ? (
            <Button onClick={() => signIn("github", { callbackUrl: "/settings" })}>
              Reconnect GitHub
            </Button>
          ) : null}
        </div>
        {reposQuery.isLoading ? <p className="text-sm text-slate-400">Loading repositories...</p> : null}
        {reposQuery.isError ? (
          <p className="text-sm text-rose-500">
            Unable to load repositories right now. Please retry or reconnect GitHub.
          </p>
        ) : null}
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Organization</h2>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          {reposQuery.data?.organization
            ? `${reposQuery.data.organization.name} (${reposQuery.data.organization.slug})`
            : "No organization found yet. Connect a repository to initialize one."}
        </p>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Projects / Repositories</h2>
        {feedback ? <p className="text-sm text-indigo-600 dark:text-indigo-300">{feedback}</p> : null}

        {displayRepos.length === 0 && !reposQuery.isLoading ? (
          <div className="rounded-md border border-dashed border-border-light p-4 text-sm text-slate-500 dark:border-border-dark dark:text-slate-300">
            No repositories found yet. Connect GitHub and fetch repositories to get started.
          </div>
        ) : null}

        <div className="space-y-3">
          {displayRepos.map((repo) => (
            <div
              key={repo.full_name}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-light p-3 dark:border-border-dark"
            >
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{repo.full_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  {repo.private ? "Private" : "Public"} · Default branch: {repo.default_branch}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-500 underline hover:text-slate-700 dark:text-slate-300"
                >
                  Open
                </a>
                <Button
                  variant={repo.connected ? "secondary" : "primary"}
                  disabled={repo.connected || connectMutation.isPending}
                  onClick={() => connectMutation.mutate(repo)}
                >
                  {repo.connected ? "Connected" : "Connect repo"}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {connectedProjects.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">Connected projects</h3>
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {connectedProjects.map((project) => (
                <li key={project.id}>{project.full_name}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
