"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/status-chip";

type Incident = {
  id: string;
  title: string;
  env: string;
  severity: string;
  status: string;
  startedAt: string;
  owner: string;
};

async function fetchIncidents(): Promise<Incident[]> {
  const response = await fetch("/api/incidents");
  if (!response.ok) throw new Error("Failed to load incidents");
  return response.json();
}

export default function IncidentsPage() {
  const { data } = useQuery({ queryKey: ["incidents"], queryFn: fetchIncidents });

  return (
    <div className="container-page space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Incidents</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Track ongoing and recent incident response.
        </p>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Owner</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((incident) => (
              <tr key={incident.id} className="border-t border-border-light dark:border-border-dark">
                <td className="px-4 py-3 text-slate-500 dark:text-slate-300">{incident.id.slice(0, 6)}</td>
                <td className="px-4 py-3">
                  <Link href={`/incidents/${incident.id}`} className="font-medium text-slate-900 dark:text-white">
                    {incident.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusChip status={incident.status} label={incident.status} />
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-300">{incident.severity}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-300">
                  {new Date(incident.startedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-300">{incident.owner}</td>
              </tr>
            )) ?? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-sm text-slate-400">
                  Loading incidents...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
