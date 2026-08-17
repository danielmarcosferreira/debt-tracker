"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useMyDebts } from "@/lib/data";
import { debtsByOwner, groupByCard } from "@/lib/aggregates";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, HandCoins, ChevronDown, CheckCircle2, Circle } from "lucide-react";

type Filter = "all" | "unpaid" | "paid";

export default function OwedElsewherePage() {
  const { user } = useAuth();
  const { t, tc, language } = useLanguage();
  const { expenses, loading } = useMyDebts(user?.uid);
  const groups = debtsByOwner(expenses);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const totalUnpaid = groups.reduce((sum, g) => sum + g.unpaidTotal, 0);

  const filterLabels: Record<Filter, string> = {
    all: t("common.filterAll"),
    unpaid: t("common.filterUnpaid"),
    paid: t("common.filterPaid"),
  };

  return (
    <>
      <TopBar
        title={t("owedElsewhere.title")}
        subtitle={
          groups.length === 0
            ? t("owedElsewhere.nothingHere")
            : t(groups.length === 1 ? "owedElsewhere.summary_one" : "owedElsewhere.summary", {
                total: formatCurrency(totalUnpaid),
                count: groups.length,
              })
        }
      />

      <main className="px-5 pt-5">
        <Link
          href="/dashboard"
          className="mb-4 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" /> {t("owedElsewhere.back")}
        </Link>

        {!loading && groups.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title={t("owedElsewhere.emptyTitle")}
            description={t("owedElsewhere.emptyDesc")}
          />
        ) : (
          <>
            <div className="mb-4 flex gap-2">
              {(["all", "unpaid", "paid"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition ${
                    filter === f
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {filterLabels[f]}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {groups.map((g) => {
                const isOpen = open === g.expenses[0]?.ownerId;
                const unpaidExpenses = g.expenses.filter((e) => !e.paid);
                const filteredExpenses = g.expenses.filter((e) => {
                  if (filter === "unpaid") return !e.paid;
                  if (filter === "paid") return e.paid;
                  return true;
                });
                const cardGroups = groupByCard(filteredExpenses);
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
                          {g.ownerName || t("owedElsewhere.someone")}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {tc("owedElsewhere.unpaidCount", unpaidExpenses.length)}
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
                      <div className="border-t border-slate-100 dark:border-slate-800">
                        {cardGroups.map((cg) => (
                          <div
                            key={cg.cardId}
                            className="border-b border-slate-100 last:border-b-0 dark:border-slate-800"
                          >
                            <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2 dark:bg-slate-800/50">
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {cg.cardName}
                              </p>
                              <p className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                                {formatCurrency(cg.total, cg.expenses[0]?.currency)}
                              </p>
                            </div>
                            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                              {cg.expenses.map((e) => (
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
                                      {formatDate(e.date, language)}
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </>
  );
}
