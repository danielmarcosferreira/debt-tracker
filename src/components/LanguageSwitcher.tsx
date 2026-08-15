"use client";

import { useLanguage } from "@/lib/language-context";
import { LANGUAGES } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Compact EN/PT toggle for pre-auth pages, where the full Profile settings aren't reachable yet. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-slate-100 p-0.5 dark:bg-slate-800",
        className
      )}
    >
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLanguage(l.code)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium uppercase transition",
            language === l.code
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-500 dark:text-slate-400"
          )}
        >
          {l.code}
        </button>
      ))}
    </div>
  );
}
