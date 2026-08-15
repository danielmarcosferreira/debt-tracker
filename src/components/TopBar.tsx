"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "./ThemeToggle";
import { initials } from "@/lib/utils";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user, profile } = useAuth();
  const name = profile?.name || user?.displayName || user?.email || "?";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur px-5 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/profile"
            title={user?.email ?? "Profile"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:hover:bg-indigo-900"
          >
            {initials(name)}
          </Link>
        </div>
      </div>
    </header>
  );
}
