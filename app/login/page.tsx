"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Sign in to Ravah</h1>
      <p className="text-sm text-slate-500 dark:text-slate-300">
        Connect your GitHub account to sync workflow runs.
      </p>
      <Button onClick={() => signIn("github")}>Continue with GitHub</Button>
    </div>
  );
}
