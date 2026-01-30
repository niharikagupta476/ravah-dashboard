"use client";

import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SettingsPage() {
  return (
    <div className="container-page space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Default environment and theme preferences.
        </p>
      </div>
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Theme</p>
            <p className="text-sm text-slate-500 dark:text-slate-300">Toggle light or dark mode.</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Environment default</p>
            <p className="text-sm text-slate-500 dark:text-slate-300">Prod</p>
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Integrations</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-300">
          <li>PagerDuty (read-only)</li>
          <li>Slack (read-only)</li>
          <li>GitHub (read-only)</li>
        </ul>
      </Card>
    </div>
  );
}
