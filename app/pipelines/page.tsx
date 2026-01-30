"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";

type Pipeline = {
  id: string;
  name: string;
  service: string;
  owner: string;
  env: string;
  status: string;
  durationSec: number;
  lastRunAt: string;
};

async function fetchPipelines(status: string): Promise<Pipeline[]> {
  const response = await fetch(`/api/pipelines?status=${status}`);
  if (!response.ok) throw new Error("Failed to load pipelines");
  return response.json();
}

export default function PipelinesPage() {
  const [status, setStatus] = useState("all");
  const { data } = useQuery({
    queryKey: ["pipelines", status],
    queryFn: () => fetchPipelines(status)
  });

  return (
    <div className="container-page space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Pipelines</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Monitor pipeline health and recent runs.
          </p>
        </div>
        <div className="flex gap-2">
          {["all", "success", "failed"].map((value) => (
            <Button
              key={value}
              variant={status === value ? "primary" : "secondary"}
              onClick={() => setStatus(value)}
            >
              {value === "all" ? "All" : value === "success" ? "Success" : "Failed"}
            </Button>
          ))}
        </div>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Pipeline</th>
              <th className="px-4 py-3">Environment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Owner</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((pipeline) => (
              <tr key={pipeline.id} className="border-t border-border-light dark:border-border-dark">
                <td className="px-4 py-3">
                  <Link href={`/pipelines/${pipeline.id}`} className="font-medium text-slate-900 dark:text-white">
                    {pipeline.name}
                  </Link>
                  <p className="text-xs text-slate-400">Service {pipeline.service}</p>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-300">{pipeline.env}</td>
                <td className="px-4 py-3">
                  <StatusChip status={pipeline.status} label={pipeline.status} />
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-300">
                  {Math.round(pipeline.durationSec / 60)} min
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-300">
                  {pipeline.owner}
                </td>
              </tr>
            )) ?? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-slate-400">
                  Loading pipelines...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
