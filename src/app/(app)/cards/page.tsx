"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardFormSheet } from "@/components/CardFormSheet";
import { DeleteCardDialog } from "@/components/DeleteCardDialog";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useCards, useExpenses } from "@/lib/data";
import { useMonthScope, useTodayMonthKey } from "@/lib/hooks";
import { cardBalance, cardTotalsInScope, type CardMonthTotal } from "@/lib/aggregates";
import { expensesInScope, formatCurrency, formatMonthYear } from "@/lib/utils";
import type { Card } from "@/lib/types";
import { CreditCard, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

const DUE_ALERT_WINDOW_DAYS = 5;

function DueInfo({ entry }: { entry: CardMonthTotal }) {
  const { t } = useLanguage();

  if (entry.paid) {
    return (
      <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> {t("cards.invoicePaid")}
      </span>
    );
  }

  if (entry.daysUntil === null || !entry.card.dueDay) return null;

  if (!entry.overdue && entry.daysUntil > DUE_ALERT_WINDOW_DAYS) {
    return (
      <span className="text-slate-500 dark:text-slate-400">
        {t("cards.dueOnDay", { day: entry.card.dueDay })}
      </span>
    );
  }

  return (
    <span
      className={
        entry.overdue
          ? "font-medium text-red-600 dark:text-red-400"
          : "font-medium text-amber-600 dark:text-amber-400"
      }
    >
      {entry.overdue
        ? entry.daysUntil === -1
          ? t("due.overdueYesterday")
          : t("due.overdueDays", { days: -entry.daysUntil })
        : entry.daysUntil === 0
          ? t("due.today")
          : entry.daysUntil === 1
            ? t("due.tomorrow")
            : t("due.inDays", { days: entry.daysUntil })}
    </span>
  );
}

export default function CardsPage() {
  const { user } = useAuth();
  const { t, tc, language } = useLanguage();
  const { cards } = useCards(user?.uid);
  const { expenses } = useExpenses(user?.uid);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [deleting, setDeleting] = useState<Card | null>(null);
  const [showAllInvoices, setShowAllInvoices] = useState(false);

  const paymentsScope = useMonthScope(undefined, "monthScope:cards");
  const todayMonthKey = useTodayMonthKey();
  const scopedExpenses = useMemo(
    () => expensesInScope(expenses, "month", paymentsScope.monthKey, todayMonthKey),
    [expenses, paymentsScope.monthKey, todayMonthKey]
  );
  const monthlyTotals = useMemo(
    () => cardTotalsInScope(cards, scopedExpenses, paymentsScope.monthKey, showAllInvoices),
    [cards, scopedExpenses, paymentsScope.monthKey, showAllInvoices]
  );

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (card: Card) => {
    setEditing(card);
    setSheetOpen(true);
  };

  return (
    <>
      <TopBar title={t("cards.title")} subtitle={tc("cards.count", cards.length)} />

      <main className="px-2 pt-5">
        <Button onClick={openNew} className="mb-4 w-full">
          <Plus className="h-4 w-4" /> {t("cards.addCard")}
        </Button>

        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("cards.monthlyPayments")}
            </h2>
            <div className="flex items-center gap-0.5 rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
              {[false, true].map((all) => (
                <button
                  key={String(all)}
                  type="button"
                  onClick={() => setShowAllInvoices(all)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    showAllInvoices === all
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {all ? t("cards.invoicesAll") : t("cards.invoicesPending")}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={paymentsScope.onPrevMonth}
              aria-label={t("expenses.prevMonth")}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 flex-col items-center">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {paymentsScope.monthKey ? formatMonthYear(paymentsScope.monthKey, language) : " "}
              </span>
              {!paymentsScope.isCurrentMonth && (
                <button
                  type="button"
                  onClick={paymentsScope.onToday}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  {t("expenses.today")}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={paymentsScope.onNextMonth}
              aria-label={t("expenses.nextMonth")}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {monthlyTotals.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title={t("cards.monthlyPaymentsEmptyTitle")}
              description={t("cards.monthlyPaymentsEmptyDesc")}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {monthlyTotals.map((entry) => (
                <Link
                  key={entry.card.id}
                  href={`/cards/detail?id=${entry.card.id}${paymentsScope.monthKey ? `&month=${paymentsScope.monthKey}` : ""}`}
                  className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 ${
                    entry.paid ? "opacity-60" : ""
                  }`}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: entry.card.color }}
                  >
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {entry.card.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tc("cards.paymentCount", entry.count)}
                      {(entry.paid || entry.daysUntil !== null) && (
                        <>
                          {" · "}
                          <DueInfo entry={entry} />
                        </>
                      )}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatCurrency(entry.total, entry.card.currency)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {cards.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={t("cards.emptyTitle")}
            description={t("cards.emptyDesc")}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map((card) => {
              const balance = cardBalance(card.id, expenses);
              const pct = card.limit
                ? Math.min(100, Math.round((balance / card.limit) * 100))
                : null;
              return (
                <div
                  key={card.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between">
                    <Link
                      href={`/cards/detail?id=${card.id}`}
                      className="flex flex-1 items-center gap-3"
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: card.color }}
                      >
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {card.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {[card.bank, card.last4 && `•••• ${card.last4}`]
                            .filter(Boolean)
                            .join(" · ") || t("cards.creditCardFallback")}
                        </p>
                      </div>
                    </Link>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => openEdit(card)}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(card)}
                        className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <Link href={`/cards/detail?id=${card.id}`} className="block">
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t("cards.currentBalance")}
                        </p>
                        <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
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
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t("cards.availableLimit", {
                            amount: formatCurrency(
                              Math.max(0, card.limit! - balance),
                              card.currency
                            ),
                          })}
                        </p>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <CardFormSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        editing={editing}
      />
      <DeleteCardDialog card={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
