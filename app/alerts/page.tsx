"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/status-chip";

type AlertGroup = {
  id: string;
  name: string;
  service: string;
  env: string;
  severity: string;
  count: number;
  lastSeenAt: string;
  status: string;
};

async function fetchAlerts(): Promise<AlertGroup[]> {
  const response = await fetch("/api/alerts");
  if (!response.ok) throw new Error("Failed to load alerts");
  return response.json();
}

export default function AlertsPage() {
  const { data } = useQuery({ queryKey: ["alerts"], queryFn: fetchAlerts });

  return (
    <div className="container-page space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Alerts</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Grouped alerts by service and severity.
        </p>
      </div>
      <div className="space-y-4">
        {data?.map((alert) => (
          <Card key={alert.id} className="flex items-center justify-between p-4">
            <div>
              <Link href={`/alerts/${alert.id}`} className="text-sm font-semibold text-slate-900 dark:text-white">
                {alert.name}
              </Link>
              <p className="mt-1 text-xs text-slate-400">
                {alert.service} · {alert.env}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <StatusChip status={alert.severity} label={alert.severity} />
              <span className="text-sm text-slate-500">{alert.count} alerts</span>
              <span className="text-xs text-slate-400">
                Last seen {new Date(alert.lastSeenAt).toLocaleTimeString()}
              </span>
            </div>
          </Card>
        )) ?? <Card className="p-4 text-sm text-slate-400">Loading alerts...</Card>}
      </div>
    </div>
  );
}
