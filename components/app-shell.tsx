"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useRef, useState, useEffect } from "react";
import { useSession, signOut, signIn } from "next-auth/react";
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
      { label: "Pipeline Copilot", href: "/copilots/pipeline" },
      { label: "Alert Copilot", href: "/alerts" },
      { label: "RCA Copilot", href: "/incidents" }
    ]
  },
  { label: "Settings", href: "/settings" }
];

/**
 * UserMenu — shows GitHub avatar + name when authenticated,
 * with a dropdown for Settings and Logout.
 * Falls back to "Continue with GitHub" when unauthenticated.
 */
function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (status === "loading") {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />;
  }

  if (!session?.user) {
    return (
      <Button variant="secondary" onClick={() => signIn("github", { callbackUrl: "/dashboard" })}>
        Continue with GitHub
      </Button>
    );
  }

  const displayName = session.user.name ?? session.user.email ?? "User";
  const avatarUrl = session.user.image;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={displayName} className="h-7 w-7 rounded-full" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-xs font-semibold text-slate-700 dark:bg-slate-600 dark:text-slate-100">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-[120px] truncate md:block">{displayName}</span>
        {/* Chevron */}
        <svg className="h-3 w-3 text-slate-400" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-md border border-border-light bg-panel-light py-1 shadow-lg dark:border-border-dark dark:bg-panel-dark">
          <div className="border-b border-border-light px-3 py-2 dark:border-border-dark">
            <p className="truncate text-xs font-medium text-slate-900 dark:text-white">{displayName}</p>
            {session.user.email && (
              <p className="truncate text-xs text-slate-400">{session.user.email}</p>
            )}
          </div>
          <Link
            href="/settings"
            className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <button
            className="flex w-full items-center px-3 py-2 text-sm text-rose-600 hover:bg-slate-100 dark:text-rose-400 dark:hover:bg-slate-800"
            onClick={() => {
              setOpen(false);
              // Redirect to /login after sign out
              signOut({ callbackUrl: "/login" });
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

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
            {/* Fix #2: Replaced static "User" button with proper user menu */}
            <UserMenu />
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
