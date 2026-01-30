"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/status-chip";
import { StageFlow } from "@/components/stage-flow";
import { InsightInlineCard } from "@/components/insight-inline-card";
import { InsightDrawer, type InsightData } from "@/components/insight-drawer";
import { Modal } from "@/components/ui/modal";

async function fetchPipeline(id: string) {
  const response = await fetch(`/api/pipelines/${id}`);
  if (!response.ok) throw new Error("Failed to load pipeline");
  return response.json();
}

async function applyFix(id: string) {
  const response = await fetch(`/api/pipelines/${id}/apply-fix`, { method: "POST" });
  if (!response.ok) throw new Error("Failed to apply fix");
  return response.json();
}

export default function PipelineDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["pipeline", id], queryFn: () => fetchPipeline(id) });
  const runId = data?.run?.id as string | undefined;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => applyFix(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", id] });
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setToast("Fix applied.");
      setConfirmOpen(false);
      setDrawerOpen(false);
      setTimeout(() => setToast(null), 3000);
    }
  });

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "i" && data?.insight && data?.status?.toLowerCase() === "failed") {
        setDrawerOpen(true);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [data?.insight, data?.status]);

  const stages = useMemo(() => {
    return (
      data?.run?.stages?.map((stage: { name: string; status: string }) => ({
        name: stage.name,
        status: stage.status.toLowerCase() === "success" ? "success" : stage.status.toLowerCase() === "failed" ? "failed" : "pending"
      })) ?? []
    );
  }, [data]);

  const insightData: InsightData | null = data?.insight
    ? {
        rootCause: data.insight.rootCause,
        confidence: data.insight.confidence,
        suggestedFix: data.insight.suggestedFix,
        riskImpact: data.insight.riskImpact,
        relatedChange: data.insight.relatedChange
      }
    : null;

  if (!data) {
    return <div className="container-page">Loading pipeline...</div>;
  }

  const isFailed = data.status.toLowerCase() === "failed";

  return (
    <div className="container-page space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{data.name}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {data.env} · Duration {Math.round(data.durationSec / 60)} min
          </p>
        </div>
        <StatusChip status={data.status} label={data.status} />
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Stage flow</h2>
        <div className="mt-4">
          <StageFlow stages={stages} current={stages.find((stage) => stage.status === "failed")?.name ?? ""} />
        </div>
      </Card>

      {insightData && isFailed && (
        <InsightInlineCard
          onViewInsight={() => setDrawerOpen(true)}
          onViewLogs={() => setLogOpen(true)}
        />
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
        mode="pipeline"
        onApplyFix={() => setConfirmOpen(true)}
        onViewLogs={() => setLogOpen(true)}
      />

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Apply fix</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Apply the suggested fix and mark this pipeline run as successful?
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()}>Confirm</Button>
        </div>
      </Modal>

      <Modal open={logOpen} onClose={() => setLogOpen(false)}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Pipeline logs</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          {data.run?.logsText ?? "Logs unavailable."}
        </p>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setLogOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent activity</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-300">
          {data.activity?.length ? (
            data.activity.map((entry: { id: string; message: string; createdAt: string }) => (
              <li key={entry.id} className="flex items-center justify-between">
                <span>{entry.message}</span>
                <span className="text-xs text-slate-400">
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </span>
              </li>
            ))
          ) : (
            <li className="text-slate-400">No activity recorded.</li>
          )}
        </ul>
      </Card>

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-md bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
