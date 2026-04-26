"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/status-chip";
import { StageFlow } from "@/components/stage-flow";

async function fetchRun(id: string) {
  const response = await fetch(`/api/runs/${id}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error("Run not found");
    throw new Error("Failed to load run");
  }
  return response.json();
}

export default function PipelineRunCopilotDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data, error, isError } = useQuery({ queryKey: ["pipeline-run", id], queryFn: () => fetchRun(id) });

  if (isError && error instanceof Error && error.message === "Run not found") {
    return <div className="container-page">Run not found or not synced yet</div>;
  }

  if (!data) {
    return <div className="container-page">Loading run...</div>;
  }

  return (
    <div className="container-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Run {data.id.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {data.pipelineName} · {new Date(data.startedAt).toLocaleString()}
          </p>
        </div>
        <StatusChip status={data.status} label={data.status} />
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Stage timeline</h2>
        <div className="mt-4">
          <StageFlow
            stages={data.stages.map((stage: { name: string; status: string }) => ({
              name: stage.name,
              status:
                stage.status.toLowerCase() === "success"
                  ? "success"
                  : stage.status.toLowerCase() === "failed"
                    ? "failed"
                    : "pending"
            }))}
            current={data.stages.find((stage: { status: string }) => stage.status.toLowerCase() === "failed")?.name ?? ""}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Failed step & logs</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          {data.jobs.find((job: { status: string }) => job.status.toLowerCase() === "failed")?.name ?? "No failed job found"}
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {data.logsText}
        </pre>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">System analysis</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li><span className="font-medium">Summary:</span> {data.analysis.summary}</li>
          <li><span className="font-medium">Root cause:</span> {data.analysis.rootCause}</li>
          <li><span className="font-medium">Failure category:</span> {data.analysis.failureCategory}</li>
          <li>
            <span className="font-medium">Recommendations:</span>
            <ul className="ml-5 mt-1 list-disc">
              {data.analysis.recommendations.map((rec: string) => (
                <li key={rec}>{rec}</li>
              ))}
            </ul>
          </li>
        </ul>
      </Card>
    </div>
  );
}
