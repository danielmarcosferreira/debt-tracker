"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useCards, usePeople, useExpenses, markExpensePaid, setCardInvoicePaid } from "@/lib/data";
import { useMonthScope } from "@/lib/hooks";
import { cardBalance } from "@/lib/aggregates";
import { expensesInMonth, formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";
import { CardFormSheet } from "@/components/CardFormSheet";
import { EditExpenseDialog } from "@/components/EditExpenseDialog";
import { DeleteExpenseDialog } from "@/components/DeleteExpenseDialog";
import { DeleteCardDialog } from "@/components/DeleteCardDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { MonthScopePicker } from "@/components/MonthScopePicker";
import type { Expense } from "@/lib/types";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Receipt,
  CheckCircle2,
  Circle,
  CreditCard,
} from "lucide-react";

type Filter = "all" | "unpaid" | "paid";

export default function CardDetailPage() {
  return (
    <Suspense fallback={null}>
      <CardDetail />
    </Suspense>
  );
}

function CardDetail() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const initialMonth = searchParams.get("month");
  const monthScope = useMonthScope({
    scope: initialMonth ? "month" : "all",
    monthKey: initialMonth,
  });
  const month = monthScope.monthKey;
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { cards } = useCards(user?.uid);
  const { people } = usePeople(user?.uid);
  const { expenses } = useExpenses(user?.uid);
  const [filter, setFilter] = useState<Filter>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [markingMonthPaid, setMarkingMonthPaid] = useState(false);

  const card = cards.find((c) => c.id === id);
  const cardExpenses = expensesInMonth(
    expenses.filter((e) => e.cardId === id),
    month
  )
    // Unpaid first (what still needs to be paid), newest first within each group.
    .sort((a, b) => Number(a.paid) - Number(b.paid) || b.date.localeCompare(a.date));

  const handleMarkMonthPaid = async () => {
    if (!month) return;
    setMarkingMonthPaid(true);
    try {
      await setCardInvoicePaid(id, month, true);
    } finally {
      setMarkingMonthPaid(false);
    }
  };

  const handleUndoMonthPaid = async () => {
    if (!month) return;
    setMarkingMonthPaid(true);
    try {
      await setCardInvoicePaid(id, month, false);
    } finally {
      setMarkingMonthPaid(false);
    }
  };

  const filtered = cardExpenses.filter((e) => {
    if (filter === "unpaid") return !e.paid;
    if (filter === "paid") return e.paid;
    return true;
  });

  const filterLabels: Record<Filter, string> = {
    all: t("common.filterAll"),
    unpaid: t("common.filterUnpaid"),
    paid: t("common.filterPaid"),
  };

  if (!card) {
    return (
      <main className="px-2 pt-5">
        <button
          onClick={() => router.push("/cards")}
          className="mb-4 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" /> {t("cardDetail.back2")}
        </button>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("cardDetail.notFound")}
        </p>
      </main>
    );
  }

  const balance = month ? cardBalance(card.id, cardExpenses) : cardBalance(card.id, expenses);
  const pct = card.limit ? Math.min(100, Math.round((balance / card.limit) * 100)) : null;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto max-w-lg">
          <Link
            href="/cards"
            className="mb-3 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
          >
            <ArrowLeft className="h-4 w-4" /> {t("cardDetail.back")}
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: card.color }}
            >
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-100">
                {card.name}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {[card.bank, card.last4 && `•••• ${card.last4}`]
                  .filter(Boolean)
                  .join(" · ") || t("cards.creditCardFallback")}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setEditOpen(true)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("cards.currentBalance")}
              </p>
              <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {formatCurrency(balance, card.currency)}
              </p>
            </div>
            {card.dueDay && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("cards.dueOnDay", { day: card.dueDay })}
              </p>
            )}
          </div>

          {pct !== null && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-indigo-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {t("cards.pctOfLimit", {
                  pct,
                  limit: formatCurrency(card.limit!, card.currency),
                })}
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="px-2 pt-5">
        <MonthScopePicker {...monthScope} />

        {month && cardExpenses.length > 0 && (
          <div className="mb-4">
            {!card.paidInvoiceCycles?.includes(month) ? (
              <>
                <Button
                  type="button"
                  onClick={handleMarkMonthPaid}
                  loading={markingMonthPaid}
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t("cardDetail.markMonthPaid", { month: formatMonthYear(month, language) })}
                </Button>
                <p className="mt-1.5 px-1 text-xs text-slate-400 dark:text-slate-500">
                  {t("cardDetail.markMonthPaidDesc", { month: formatMonthYear(month, language) })}
                </p>
              </>
            ) : (
              <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 dark:border-emerald-900 dark:bg-emerald-950/40">
                <span className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("cardDetail.monthPaid", { month: formatMonthYear(month, language) })}
                </span>
                <button
                  type="button"
                  onClick={handleUndoMonthPaid}
                  disabled={markingMonthPaid}
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50 dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                  {t("cardDetail.undoMarkMonthPaid")}
                </button>
              </div>
            )}
          </div>
        )}

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

        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t("cardDetail.emptyTitle")}
            description={
              month
                ? filter === "all"
                  ? t("cardDetail.emptyDescMonth", { month: formatMonthYear(month, language) })
                  : t("cardDetail.emptyDescMonthFiltered", {
                      filter: filterLabels[filter],
                      month: formatMonthYear(month, language),
                    })
                : filter === "all"
                  ? t("cardDetail.emptyDescAll")
                  : t("cardDetail.emptyDescFiltered", { filter: filterLabels[filter] })
            }
          />
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {filtered.map((e) => {
              const person = people.find((p) => p.id === e.personId);
              return (
                <div key={e.id} className="flex items-center gap-3 p-3.5">
                  <button
                    onClick={() => markExpensePaid(e.id, !e.paid)}
                    className="shrink-0 text-slate-400 transition hover:text-emerald-500 dark:text-slate-500 dark:hover:text-emerald-400"
                    title={e.paid ? t("common.markUnpaid") : t("common.markPaid")}
                  >
                    {e.paid ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <Circle className="h-6 w-6 stroke-[1.75]" />
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
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(e.date, language)} · {person?.name ?? t("expenses.you")}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
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
              );
            })}
          </div>
        )}
      </main>

      <CardFormSheet open={editOpen} onClose={() => setEditOpen(false)} editing={card} />
      <DeleteCardDialog
        card={deleteOpen ? card : null}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => router.push("/cards")}
      />
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
