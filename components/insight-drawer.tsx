"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type InsightMode = "pipeline" | "alert" | "incident";

export type InsightData = {
  rootCause: string;
  confidence: "High" | "Med" | "Low";
  suggestedFix: string[];
  riskImpact: "Low" | "Med" | "High";
  relatedChange?: string;
};

export function InsightDrawer({
  open,
  onClose,
  data,
  mode,
  onApplyFix,
  onCreatePr,
  onEscalate,
  onViewLogs
}: {
  open: boolean;
  onClose: () => void;
  data: InsightData;
  mode: InsightMode;
  onApplyFix?: () => void;
  onCreatePr?: () => void;
  onEscalate?: () => void;
  onViewLogs?: () => void;
}) {
  const primaryRootCause = data.rootCause;
  const contributing = data.suggestedFix.slice(0, 2);
  const executiveSummary = [data.rootCause, ...data.suggestedFix].slice(0, 5);

  return (
    <div
      className={cn(
        "fixed inset-0 z-40",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/30 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute right-0 top-0 h-full w-full max-w-[420px] transform bg-panel-light p-6 shadow-xl transition-transform dark:bg-panel-dark",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">System Insight</h2>
          <button className="text-sm text-slate-500" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-6 space-y-4 overflow-y-auto pb-12">
          {mode !== "incident" && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold">Root cause</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{data.rootCause}</p>
            </Card>
          )}

          {mode === "incident" && (
            <>
              <Card className="p-4">
                <h3 className="text-sm font-semibold">Primary root cause</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {primaryRootCause}
                </p>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-semibold">Contributing factors</h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600 dark:text-slate-300">
                  {contributing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-semibold">Preventive actions</h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600 dark:text-slate-300">
                  {data.suggestedFix.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-semibold">Executive summary</h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600 dark:text-slate-300">
                  {executiveSummary.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
            </>
          )}

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Confidence</span>
              <span className="text-sm text-slate-500 dark:text-slate-300">{data.confidence}</span>
            </div>
          </Card>

          {mode !== "incident" && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold">Suggested fix</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600 dark:text-slate-300">
                {data.suggestedFix.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          )}

          {mode !== "incident" && data.relatedChange && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold">Related change</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{data.relatedChange}</p>
            </Card>
          )}

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Risk impact</span>
              <span className="text-sm text-slate-500 dark:text-slate-300">{data.riskImpact}</span>
            </div>
          </Card>
          <div className="flex flex-col gap-3">
            {onApplyFix && <Button onClick={onApplyFix}>Apply Fix</Button>}
            {onViewLogs && (
              <Button variant="secondary" onClick={onViewLogs}>
                View Logs
              </Button>
            )}
            {onCreatePr && (
              <Button variant="secondary" onClick={onCreatePr}>
                Create PR
              </Button>
            )}
            {onEscalate && (
              <Button variant="ghost" onClick={onEscalate}>
                Escalate Incident
              </Button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
