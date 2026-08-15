"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { DueBanner } from "@/components/DueBanner";
import { MonthScopePicker } from "@/components/MonthScopePicker";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useMonthScope } from "@/lib/hooks";
import { useCards, usePeople, useExpenses, useMyDebts } from "@/lib/data";
import {
  cardBalance,
  myUnpaidTotals,
  owedToMeTotals,
  upcomingDueDates,
  debtsByOwner,
  type CurrencyTotals,
} from "@/lib/aggregates";
import { expensesInMonth, formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, ArrowRight, Receipt, HandCoins } from "lucide-react";
import type { CurrencyCode } from "@/lib/types";

function TotalsLine({ totals, fallback }: { totals: CurrencyTotals; fallback: CurrencyCode }) {
  const entries = Object.entries(totals) as [CurrencyCode, number][];
  if (entries.length === 0) return <>{formatCurrency(0, fallback)}</>;
  return <>{entries.map(([code, amt]) => formatCurrency(amt, code)).join(" + ")}</>;
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { t, tc, language } = useLanguage();
  const { cards } = useCards(user?.uid);
  const { people } = usePeople(user?.uid);
  const { expenses } = useExpenses(user?.uid);
  const { expenses: myDebtExpenses } = useMyDebts(user?.uid);
  const monthScope = useMonthScope();
  const { monthKey } = monthScope;

  // Debt totals respect the month/all-time picker; card balances and recent
  // activity below always reflect the current, unscoped state.
  const scopedExpenses = expensesInMonth(expenses, monthKey);
  const scopedMyDebtExpenses = expensesInMonth(myDebtExpenses, monthKey);

  const myDebt = myUnpaidTotals(scopedExpenses);
  const owedToMe = owedToMeTotals(scopedExpenses);
  const due = upcomingDueDates(cards);
  const owedGroups = debtsByOwner(scopedMyDebtExpenses).filter((g) => g.unpaidTotal > 0);
  const owedElsewhereTotal = owedGroups.reduce((sum, g) => sum + g.unpaidTotal, 0);
  const firstName = profile?.name?.split(" ")[0] ?? user?.displayName?.split(" ")[0];

  const recent = expenses.slice(0, 5);
  const currency = profile?.defaultCurrency ?? "USD";

  return (
    <>
      <TopBar
        title={firstName ? t("dashboard.greeting", { name: firstName }) : t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
      />

      <DueBanner due={due} />

      <main className="px-5 pt-5">
        <MonthScopePicker {...monthScope} />

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-900 p-4 text-white dark:bg-slate-800">
            <p className="text-xs font-medium text-slate-300">{t("dashboard.iOwe")}</p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums">
              <TotalsLine totals={myDebt} fallback={currency} />
            </p>
            <p className="mt-1 text-xs text-slate-400">{t("dashboard.acrossCards")}</p>
          </div>
          <div className="rounded-2xl bg-emerald-600 p-4 text-white">
            <p className="text-xs font-medium text-emerald-100">{t("dashboard.owedToMe")}</p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums">
              <TotalsLine totals={owedToMe} fallback={currency} />
            </p>
            <p className="mt-1 text-xs text-emerald-100">
              {tc("dashboard.byPeople", people.length)}
            </p>
          </div>
        </div>

        {owedElsewhereTotal > 0 && (
          <Link
            href="/i-owe"
            className="mt-3 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-900 dark:bg-amber-950"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
              <HandCoins className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                {t("dashboard.oweElsewhere", {
                  amount: formatCurrency(owedElsewhereTotal, currency),
                })}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {tc("dashboard.toPeopleLinked", owedGroups.length)}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-amber-500" />
          </Link>
        )}

        {/* Cards summary */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("dashboard.yourCards")}
            </h2>
            <Link
              href="/cards"
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400"
            >
              {t("dashboard.viewAll")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {cards.length === 0 ? (
            <EmptyLink href="/cards" icon={CreditCard} text={t("dashboard.addFirstCard")} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {cards.slice(0, 3).map((card) => {
                const balance = cardBalance(card.id, expenses);
                const pct = card.limit
                  ? Math.min(100, Math.round((balance / card.limit) * 100))
                  : null;
                return (
                  <Link
                    href="/cards"
                    key={card.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: card.color }}
                    >
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {card.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {card.last4 ? `•••• ${card.last4}` : card.bank || t("cards.cardFallback")}
                      </p>
                      {pct !== null && (
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {formatCurrency(balance, card.currency)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("dashboard.recentActivity")}
            </h2>
            <Link
              href="/expenses"
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400"
            >
              {t("dashboard.viewAll")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyLink href="/expenses" icon={Receipt} text={t("dashboard.logFirstExpense")} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {recent.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {e.description}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(e.date, language)} · {e.cardName}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      e.paid
                        ? "text-slate-400 dark:text-slate-500"
                        : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {formatCurrency(e.amount, e.currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function EmptyLink({
  href,
  icon: Icon,
  text,
}: {
  href: string;
  icon: typeof CreditCard;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
    >
      <Icon className="h-4 w-4" />
      {text}
    </Link>
  );
}
