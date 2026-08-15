"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { cn, formatMonthYear } from "@/lib/utils";
import type { MonthScope } from "@/lib/hooks";

export function MonthScopePicker({
  scope,
  setScope,
  monthKey,
  isCurrentMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
}: MonthScope) {
  const { t, language } = useLanguage();

  return (
    <div className="mb-4 flex flex-col gap-2.5">
      <div className="flex w-full items-center gap-0.5 rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
        {(["month", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition",
              scope === s
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            {s === "month" ? t("scope.month") : t("scope.all")}
          </button>
        ))}
      </div>

      {scope === "month" && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label={t("expenses.prevMonth")}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-col items-center">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {monthKey ? formatMonthYear(monthKey, language) : " "}
            </span>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={onToday}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                {t("expenses.today")}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label={t("expenses.nextMonth")}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
