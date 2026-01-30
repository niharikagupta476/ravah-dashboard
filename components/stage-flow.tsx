import { cn } from "@/lib/utils";

export function StageFlow({
  stages,
  current
}: {
  stages: { name: string; status: "success" | "failed" | "pending" }[];
  current: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {stages.map((stage, index) => (
        <div key={stage.name} className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              stage.status === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : stage.status === "failed"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-200",
              stage.name === current ? "ring-2 ring-accent" : ""
            )}
          >
            {stage.name}
          </span>
          {index < stages.length - 1 && <span className="text-slate-400">→</span>}
        </div>
      ))}
    </div>
  );
}
