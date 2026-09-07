"use client";

import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import type { UpcomingDue } from "@/lib/aggregates";
import { useLanguage } from "@/lib/language-context";

export function DueBanner({ due, onClose }: { due: UpcomingDue[]; onClose?: () => void }) {
  const { t } = useLanguage();
  if (due.length === 0) return null;

  const hasOverdue = due.some((d) => d.overdue);

  return (
    <div
      className={`relative mx-5 mt-4 flex flex-col gap-2 rounded-2xl border p-3.5 ${
        hasOverdue
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
          : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
      }`}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className={`absolute right-2 top-2 rounded-full p-1 transition ${
            hasOverdue
              ? "text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
              : "text-amber-500 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900"
          }`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {due.map(({ card, daysUntil, overdue, monthKey }) => (
        <Link
          key={card.id}
          href={`/cards/detail?id=${card.id}&month=${monthKey}`}
          className={`flex items-center gap-2.5 ${onClose ? "pr-6" : ""}`}
        >
          <AlertTriangle
            className={`h-4 w-4 shrink-0 ${
              overdue ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
            }`}
          />
          <p
            className={`text-sm ${
              overdue ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300"
            }`}
          >
            <span className="font-medium">{card.name}</span>{" "}
            {overdue
              ? daysUntil === -1
                ? t("due.overdueYesterday")
                : t("due.overdueDays", { days: -daysUntil })
              : daysUntil === 0
                ? t("due.today")
                : daysUntil === 1
                  ? t("due.tomorrow")
                  : t("due.inDays", { days: daysUntil })}
          </p>
        </Link>
      ))}
    </div>
  );
}
