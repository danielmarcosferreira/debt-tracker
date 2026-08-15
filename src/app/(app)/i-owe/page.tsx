"use client";

import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useMyDebts } from "@/lib/data";
import { debtsByOwner } from "@/lib/aggregates";
import { formatCurrency, formatDate } from "@/lib/utils";
import { HandCoins, ChevronDown, CheckCircle2, Circle } from "lucide-react";

export default function IOwePage() {
  const { user } = useAuth();
  const { t, tc, language } = useLanguage();
  const { expenses, loading } = useMyDebts(user?.uid);
  const groups = debtsByOwner(expenses);
  const [open, setOpen] = useState<string | null>(null);

  const totalUnpaid = groups.reduce((sum, g) => sum + g.unpaidTotal, 0);

  return (
    <>
      <TopBar
        title={t("iOwe.title")}
        subtitle={
          groups.length === 0
            ? t("iOwe.nothingHere")
            : t(groups.length === 1 ? "iOwe.summary_one" : "iOwe.summary", {
                total: formatCurrency(totalUnpaid),
                count: groups.length,
              })
        }
      />

      <main className="px-5 pt-5">
        {!loading && groups.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title={t("iOwe.emptyTitle")}
            description={t("iOwe.emptyDesc")}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((g) => {
              const isOpen = open === g.expenses[0]?.ownerId;
              const unpaidExpenses = g.expenses.filter((e) => !e.paid);
              return (
                <div
                  key={g.ownerName + g.expenses[0]?.ownerId}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : g.expenses[0]?.ownerId)}
                    className="flex w-full items-center gap-3 p-3.5"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      {g.ownerName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {g.ownerName || t("iOwe.someone")}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tc("iOwe.unpaidCount", unpaidExpenses.length)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {formatCurrency(g.unpaidTotal)}
                    </p>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="flex flex-col divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                      {g.expenses.map((e) => (
                        <div key={e.id} className="flex items-center gap-3 p-3.5">
                          {e.paid ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                              {e.description}
                              {e.installment && (
                                <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">
                                  {e.installment.index}/{e.installment.count}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(e.date, language)} · {e.cardName}
                            </p>
                          </div>
                          <p
                            className={`shrink-0 text-sm font-semibold tabular-nums ${e.paid ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}
                          >
                            {formatCurrency(e.amount, e.currency)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
