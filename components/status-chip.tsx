import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  failed: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200"
};

export function StatusChip({ status, label }: { status: string; label?: string }) {
  const normalized = status.toLowerCase();
  const variant =
    normalized === "success" || normalized === "healthy" || normalized === "resolved"
      ? "success"
      : normalized === "failed" || normalized === "critical"
        ? "failed"
        : normalized === "warning" || normalized === "degraded"
          ? "warning"
          : "neutral";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        styles[variant]
      )}
    >
      {label ?? status}
    </span>
  );
}
