import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function InsightInlineCard({
  onViewInsight,
  onViewLogs,
  title = "Insight available",
  body = "Likely root cause detected. View system insight for recommended fix."
}: {
  onViewInsight: () => void;
  onViewLogs?: () => void;
  title?: string;
  body?: string;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{body}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onViewInsight}>View insight</Button>
        {onViewLogs && (
          <Button variant="secondary" onClick={onViewLogs}>
            View logs
          </Button>
        )}
      </div>
    </Card>
  );
}
