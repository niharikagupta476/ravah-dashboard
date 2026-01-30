"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { InsightDrawer, type InsightData } from "@/components/insight-drawer";

async function fetchIncident(id: string) {
  const response = await fetch(`/api/incidents/${id}`);
  if (!response.ok) throw new Error("Failed to load incident");
  return response.json();
}

async function fetchInsight(entityId: string) {
  const response = await fetch(`/api/insights?entityType=incident&entityId=${entityId}`);
  if (!response.ok) throw new Error("Failed to load insight");
  return response.json();
}

const tabs = ["Overview", "Timeline", "RCA"] as const;

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const { data } = useQuery({ queryKey: ["incident", id], queryFn: () => fetchIncident(id) });
  const { data: insight } = useQuery({
    queryKey: ["insight", id],
    queryFn: () => fetchInsight(id),
    enabled: !!id
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "i" && insight) {
        setDrawerOpen(true);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [insight]);

  const insightData: InsightData | null = insight
    ? {
        rootCause: insight.rootCause,
        confidence: insight.confidence,
        suggestedFix: insight.suggestedFix,
        riskImpact: insight.riskImpact
      }
    : null;

  if (!data) {
    return <div className="container-page">Loading incident...</div>;
  }

  return (
    <div className="container-page space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{data.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {data.env} · Owner {data.owner}
          </p>
        </div>
        <StatusChip status={data.status} label={data.status} />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "primary" : "secondary"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <Card className="space-y-4 p-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Summary</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Incident response is in progress. Primary mitigation has stabilized core checkout flows.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-slate-400">Impacted services</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Payments, Cart, API Gateway</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Key metric</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">p95 latency 820ms</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Severity</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{data.severity}</p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "Timeline" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Timeline</h3>
          <ul className="mt-4 space-y-3">
            {data.events.map((event: { id: string; timestamp: string; type: string; message: string }) => (
              <li key={event.id} className="text-sm">
                <div className="text-slate-400">{new Date(event.timestamp).toLocaleString()}</div>
                <div className="text-slate-700 dark:text-slate-200">{event.message}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {activeTab === "RCA" && (
        <Card className="flex items-center justify-between p-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">RCA summary available</h3>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              View the RCA summary when ready.
            </p>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>View Summary</Button>
        </Card>
      )}

      <InsightDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        data={
          insightData ?? {
            rootCause: [],
            confidence: "Low",
            suggestedFix: [],
            riskImpact: "Low"
          }
        }
        mode="incident"
        onApplyFix={undefined}
        onCreatePr={() => setDrawerOpen(false)}
        onEscalate={() => setDrawerOpen(false)}
      />
    </div>
  );
}
