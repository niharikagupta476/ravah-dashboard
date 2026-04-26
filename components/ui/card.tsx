import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border-light bg-panel-light shadow-sm dark:border-border-dark dark:bg-panel-dark",
        className
      )}
      {...props}
    />
  );
}
