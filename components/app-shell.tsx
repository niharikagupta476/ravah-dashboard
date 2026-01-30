"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Pipelines", href: "/pipelines" },
  { label: "Alerts", href: "/alerts" },
  { label: "Incidents", href: "/incidents" },
  {
    label: "Copilots",
    href: "#",
    children: [
      { label: "Pipeline Copilot", href: "/pipelines" },
      { label: "Alert Copilot", href: "/alerts" },
      { label: "RCA Copilot", href: "/incidents" }
    ]
  },
  { label: "Settings", href: "/settings" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      <div className="border-b border-border-light bg-panel-light dark:border-border-dark dark:bg-panel-dark">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <button
              className="md:hidden"
              onClick={() => setOpen(!open)}
              aria-label="Toggle navigation"
            >
              <span className="block h-0.5 w-5 bg-slate-600 dark:bg-slate-200" />
              <span className="mt-1 block h-0.5 w-5 bg-slate-600 dark:bg-slate-200" />
            </button>
            <Link href="/dashboard" className="text-lg font-semibold text-slate-900 dark:text-white">
              Ravah
            </Link>
            <select
              className="hidden rounded-md border border-border-light bg-transparent px-3 py-1 text-xs text-slate-600 focus:outline-none dark:border-border-dark dark:text-slate-200 md:block"
              defaultValue="Prod"
            >
              <option>Prod</option>
              <option>Staging</option>
            </select>
          </div>
          <div className="hidden flex-1 items-center justify-center px-6 md:flex">
            <input
              className="w-full max-w-md rounded-md border border-border-light bg-transparent px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-accent dark:border-border-dark dark:text-slate-200"
              placeholder="Search infrastructure, services, owners"
            />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="secondary">User</Button>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl">
        <aside
          className={cn(
            "w-64 border-r border-border-light bg-panel-light px-4 py-6 dark:border-border-dark dark:bg-panel-dark",
            open ? "block" : "hidden",
            "md:block"
          )}
        >
          <nav className="space-y-2">
            {navItems.map((item) => (
              <div key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium",
                    pathname === item.href
                      ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ml-4 mt-2 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href}
                        className={cn(
                          "block rounded-md px-3 py-1 text-xs",
                          pathname === child.href
                            ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                            : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
