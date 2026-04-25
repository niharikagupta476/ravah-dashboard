"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/status-chip";

type DashboardData = {
  cards: {
    activePipelines: number;
    openAlerts: number;
    ongoingIncidents: number;
  };
  recentActivity: { id: string; title: string; detail: string }[];
  attention: { id: string; name: string; lastRun: string; status: string; owner: string }[];
};

async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/dashboard");
  if (!response.ok) throw new Error("Failed to load dashboard");
  return response.json();
}

export default function DashboardPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });
  const { data: session, status } = useSession();

  useEffect(() => {
    // Temporary debugging for session visibility after OAuth callback.
    console.info("[auth][dashboard] session", { status, user: session?.user?.email ?? null });
  }, [session?.user?.email, status]);

  return (
    <div className="container-page space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Overview</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          System health snapshot across pipelines, alerts, and incidents.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase text-slate-400">Active Pipelines</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            {data?.cards.activePipelines ?? "--"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase text-slate-400">Open Alerts</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            {data?.cards.openAlerts ?? "--"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase text-slate-400">Ongoing Incidents</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            {data?.cards.ongoingIncidents ?? "--"}
          </p>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr,1.2fr]">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
          <ul className="mt-4 space-y-3">
            {data?.recentActivity.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-200">{item.title}</span>
                <span className="text-slate-400">{item.detail}</span>
              </li>
            )) ?? (
              <li className="text-sm text-slate-400">Loading activity...</li>
            )}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Pipelines needing attention
          </h2>
          <div className="mt-4 overflow-hidden rounded-md border border-border-light dark:border-border-dark">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Last run</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Owner</th>
                </tr>
              </thead>
              <tbody>
                {data?.attention.map((pipeline) => (
                  <tr key={pipeline.id} className="border-t border-border-light dark:border-border-dark">
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                      {pipeline.name}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {new Date(pipeline.lastRun).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <StatusChip status={pipeline.status} label={pipeline.status} />
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-300">
                      {pipeline.owner}
                    </td>
                  </tr>
                )) ?? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-sm text-slate-400">
                      Loading pipelines...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
