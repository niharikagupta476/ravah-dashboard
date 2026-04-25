"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/status-chip";

async function fetchPipelines() {
  const response = await fetch("/api/pipelines?status=all");
  if (!response.ok) throw new Error("Failed to load pipelines");
  return response.json();
}

export default function PipelineCopilotPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["copilot-pipelines"], queryFn: fetchPipelines });

  useEffect(() => {
    async function syncRuns() {
      await fetch("/api/github/sync-runs", { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["copilot-pipelines"] });
      await queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    }

    void syncRuns();
  }, [queryClient]);

  return (
    <div className="container-page space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Pipeline Copilot</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Review recent pipeline runs and open a run for system analysis.
        </p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Pipeline</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last run</th>
              <th className="px-4 py-3">Duration</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((pipeline: { id: string; name: string; status: string; lastRunAt: string; durationSec: number }) => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
