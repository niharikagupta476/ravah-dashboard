"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";

type PipelineRow = {
  id: string;
  name: string;
  status: string;
  lastRunAt: string;
  durationSec: number;
  rootCause?: string | null;
  confidence?: string | null;
};

type PipelineApiResponse =
  | PipelineRow[]
  | {
      pipelines: PipelineRow[];
      setupRequired?: boolean;
      message?: string;
      debug?: {
        count: number;
        userId: string | null;
        orgIds: string[];
        projectIds: string[];
        filterStatus: string;
      };
    };

async function fetchPipelines(): Promise<PipelineApiResponse> {
  const response = await fetch("/api/pipelines?status=all");
  if (!response.ok) throw new Error("Failed to load pipelines");
  return response.json();
}

export default function PipelineCopilotPage() {
  const { data, isLoading } = useQuery({ queryKey: ["copilot-pipelines"], queryFn: fetchPipelines });

  const pipelines = Array.isArray(data) ? data : data?.pipelines ?? [];
  const setupRequired = !Array.isArray(data) && Boolean(data?.setupRequired);

  return (
    <div className="container-page space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Pipeline Copilot</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Review recent pipeline runs and open a run for system analysis.
        </p>
      </div>

      {pipelines.length === 0 && !isLoading ? (
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">No pipeline runs synced yet</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            {setupRequired
              ? "Connect a GitHub repository in Settings to initialize your workspace and sync workflow runs."
              : "Connect a GitHub repository and sync workflow runs to see pipeline status."}
          </p>
          <div className="mt-4">
            <Link href="/settings">
              <Button>Go to Settings</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Pipeline</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last run</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">AI RCA</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-sm text-slate-400">
                    Loading pipelines...
                  </td>
                </tr>
              ) : (
                pipelines.map((pipeline) => (
                  <tr key={pipeline.id} className="border-t border-border-light dark:border-border-dark">
                    <td className="px-4 py-3">
                      <Link href={`/pipelines/${pipeline.id}`} className="font-medium text-slate-900 dark:text-white">
                        {pipeline.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={pipeline.status} label={pipeline.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-300">{new Date(pipeline.lastRunAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-300">{Math.round(pipeline.durationSec / 60)} min</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300">
                      <p>{pipeline.rootCause ? `Root cause detected: ${pipeline.rootCause}` : "No RCA yet"}</p>
                      <p>Confidence: {pipeline.confidence ?? "unknown"}</p>
                      <Link href={`/pipelines/${pipeline.id}`} className="text-indigo-600 hover:underline dark:text-indigo-300">
                        Open RCA
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
