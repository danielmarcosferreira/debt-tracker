"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { MonthScopePicker } from "@/components/MonthScopePicker";
import { EditExpenseDialog } from "@/components/EditExpenseDialog";
import { DeleteExpenseDialog } from "@/components/DeleteExpenseDialog";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useMonthScope, useTodayMonthKey } from "@/lib/hooks";
import { useCards, usePeople, useExpenses, markExpensePaid } from "@/lib/data";
import { groupByCard, myUnpaidTotals, type CurrencyTotals } from "@/lib/aggregates";
import { expensesInScope, formatCurrency, formatDate } from "@/lib/utils";
import type { CurrencyCode, Expense } from "@/lib/types";
import { HandCoins, CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";

type Filter = "all" | "unpaid" | "paid";

function totalsLabel(totals: CurrencyTotals) {
  const entries = Object.entries(totals) as [CurrencyCode, number][];
  if (entries.length === 0) return formatCurrency(0);
  return entries.map(([code, amt]) => formatCurrency(amt, code)).join(" + ");
}

export default function IOwePage() {
  return (
    <Suspense fallback={null}>
      <IOweContent />
    </Suspense>
  );
}

function IOweContent() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const { cards } = useCards(user?.uid);
  const { people } = usePeople(user?.uid);
  const { expenses, loading } = useExpenses(user?.uid);
  const [filter, setFilter] = useState<Filter>("all");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const hasMonthParams = searchParams.has("scope") || searchParams.has("month");
  const monthScope = useMonthScope(
    hasMonthParams
      ? {
        scope: searchParams.get("scope") === "all" ? "all" : "month",
        monthKey: searchParams.get("month"),
      }
      : undefined,
    "monthScope:i-owe"
  );
  const { scope, monthKey } = monthScope;
  const todayMonthKey = useTodayMonthKey();

  // "I owe" = my own personal expenses on my own cards — not what other
  // people assign to me on their cards (see /owed-elsewhere for that).
  // "All" means "today onward," not the full history.
  const personal = expensesInScope(
    expenses.filter((e) => e.forSelf),
    scope,
    monthKey,
    todayMonthKey
  );
  const allCardGroups = groupByCard(personal);
  const totals = myUnpaidTotals(personal);

  const filterLabels: Record<Filter, string> = {
    all: t("common.filterAll"),
    unpaid: t("common.filterUnpaid"),
    paid: t("common.filterPaid"),
  };

  const filtered = personal.filter((e) => {
    if (filter === "unpaid") return !e.paid;
    if (filter === "paid") return e.paid;
    return true;
  });
  const cardGroups = groupByCard(filtered);

  return (
    <>
      <TopBar
        title={t("iOwe.title")}
        subtitle={
          personal.length === 0
            ? t("iOwe.nothingHere")
            : t(allCardGroups.length === 1 ? "iOwe.summary_one" : "iOwe.summary", {
              total: totalsLabel(totals),
              count: allCardGroups.length,
            })
        }
      />

      <main className="px-2 pt-5">
        <MonthScopePicker {...monthScope} />

        {!loading && personal.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title={t("iOwe.emptyTitle")}
            description={t("iOwe.emptyDesc")}
          />
        ) : (
          <>
            <div className="mb-4 flex gap-2">
              {(["all", "unpaid", "paid"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition ${filter === f
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                >
                  {filterLabels[f]}
                </button>
              ))}
            </div>

            {cardGroups.length === 0 ? (
              <EmptyState
                icon={HandCoins}
                title={t("iOwe.emptyTitle")}
                description={t("iOwe.emptyDescFiltered", { filter: filterLabels[filter] })}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {cardGroups.map((cg) => (
                  <div
                    key={cg.cardId}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 dark:bg-slate-800/50">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {cg.cardName}
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCurrency(cg.total, cg.expenses[0]?.currency)}
                      </p>
                    </div>
                    <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                      {cg.expenses.map((e) => (
                        <div key={e.id} className="flex items-center gap-3 p-3.5">
                          <button
                            onClick={() => markExpensePaid(e.id, !e.paid)}
                            className="shrink-0 text-slate-300 transition hover:text-emerald-500 dark:text-slate-600"
                            title={e.paid ? t("common.markUnpaid") : t("common.markPaid")}
                          >
                            {e.paid ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            ) : (
                              <Circle className="h-6 w-6" />
                            )}
                          </button>
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
                          <button
                            onClick={() => setEditingExpense(e)}
                            className="shrink-0 rounded-full p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingExpense(e)}
                            className="shrink-0 rounded-full p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <EditExpenseDialog
        expense={editingExpense}
        allExpenses={expenses}
        cards={cards}
        people={people}
        onClose={() => setEditingExpense(null)}
      />
      <DeleteExpenseDialog
        expense={deletingExpense}
        allExpenses={expenses}
        onClose={() => setDeletingExpense(null)}
      />
    </>
  );
}
