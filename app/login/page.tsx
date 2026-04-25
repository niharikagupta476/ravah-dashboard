"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [router, status]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Sign in to Ravah</h1>
      <p className="text-sm text-slate-500 dark:text-slate-300">
        Connect your GitHub account to sync workflow runs.
      </p>
      <Button onClick={() => signIn("github", { callbackUrl: "/dashboard" })}>
        Continue with GitHub
      </Button>
    </div>
  );
}
