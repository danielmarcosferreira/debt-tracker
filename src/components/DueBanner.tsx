"use client";

import { AlertTriangle } from "lucide-react";
import type { UpcomingDue } from "@/lib/aggregates";
import { useLanguage } from "@/lib/language-context";

export function DueBanner({ due }: { due: UpcomingDue[] }) {
  const { t } = useLanguage();
  if (due.length === 0) return null;

  return (
    <div className="mx-5 mt-4 flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-900 dark:bg-amber-950">
      {due.map(({ card, daysUntil }) => (
        <div key={card.id} className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-medium">{card.name}</span>{" "}
            {daysUntil <= 0
              ? t("due.today")
              : daysUntil === 1
                ? t("due.tomorrow")
                : t("due.inDays", { days: daysUntil })}
          </p>
        </div>
      ))}
    </div>
  );
}
