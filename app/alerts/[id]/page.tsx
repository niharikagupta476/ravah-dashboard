"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { InsightDrawer, type InsightData } from "@/components/insight-drawer";
import { Line, LineChart, ResponsiveContainer } from "recharts";

async function fetchAlert(id: string) {
  const response = await fetch(`/api/alerts/${id}`);
  if (!response.ok) throw new Error("Failed to load alert");
  return response.json();
}

async function fetchInsight(entityId: string) {
  const response = await fetch(`/api/insights?entityType=alertGroup&entityId=${entityId}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to load insight");
  return response.json();
}

export default function AlertDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data } = useQuery({ queryKey: ["alert", id], queryFn: () => fetchAlert(id) });
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

  const chartData = useMemo(() => {
    return (
      data?.instances?.map((instance: { timestamp: string }, index: number) => ({
        name: index,
        value: Math.max(2, 10 - index)
      })) ?? []
    );
  }, [data]);

  const insightData: InsightData | null = insight
    ? {
        rootCause: insight.rootCause,
        confidence: insight.confidence,
        suggestedFix: insight.suggestedFix,
        riskImpact: insight.riskImpact
      }
    : null;

  if (!data) {
    return <div className="container-page">Loading alert...</div>;
  }

  return (
    <div className="container-page space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{data.name}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {data.count} instances · {data.service}
          </p>
        </div>
        <StatusChip status={data.severity} label={data.severity} />
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Signal timeline</h2>
        <div className="mt-4 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Alert instances</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="py-2">Timestamp</th>
              <th className="py-2">Message</th>
              <th className="py-2">Fingerprint</th>
            </tr>
          </thead>
          <tbody>
            {data.instances.map((instance: { id: string; timestamp: string; message: string; fingerprint: string }) => (
              <tr key={instance.id} className="border-t border-border-light dark:border-border-dark">
                <td className="py-2 text-slate-500 dark:text-slate-300">
                  {new Date(instance.timestamp).toLocaleTimeString()}
                </td>
                <td className="py-2 text-slate-700 dark:text-slate-200">{instance.message}</td>
                <td className="py-2 text-slate-400">{instance.fingerprint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {insightData && (
        <Card className="flex items-center justify-between p-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Pattern detected</h3>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              System insight available for this alert group.
            </p>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>Analyze</Button>
        </Card>
      )}

      <InsightDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        data={
          insightData ?? {
            rootCause: "",
            confidence: "Low",
            suggestedFix: [],
            riskImpact: "Low"
          }
        }
        mode="alert"
        onApplyFix={() => setDrawerOpen(false)}
      />
    </div>
  );
}
