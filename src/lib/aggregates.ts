import type { Card, CurrencyCode, Expense } from "./types";

export type CurrencyTotals = Partial<Record<CurrencyCode, number>>;

function sumByCurrency(
  expenses: Expense[],
  predicate: (e: Expense) => boolean
): CurrencyTotals {
  const totals: CurrencyTotals = {};
  for (const e of expenses) {
    if (!predicate(e)) continue;
    totals[e.currency] = (totals[e.currency] ?? 0) + e.amount;
  }
  return totals;
}

/** What the signed-in owner personally owes across their own cards. */
export function myUnpaidTotals(expenses: Expense[]): CurrencyTotals {
  return sumByCurrency(expenses, (e) => e.forSelf && !e.paid);
}

/** What everyone else owes the signed-in owner. */
export function owedToMeTotals(expenses: Expense[]): CurrencyTotals {
  return sumByCurrency(expenses, (e) => !e.forSelf && !e.paid);
}

/** Total outstanding balance on one card (self + others), regardless of who it's for. */
export function cardBalance(cardId: string, expenses: Expense[]): number {
  return expenses
    .filter((e) => e.cardId === cardId && !e.paid)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function personTotals(personId: string, expenses: Expense[]) {
  const mine = expenses.filter((e) => e.personId === personId);
  const owed = mine
    .filter((e) => !e.paid)
    .reduce((sum, e) => sum + e.amount, 0);
  const paid = mine.filter((e) => e.paid).reduce((sum, e) => sum + e.amount, 0);
  return { owed, paid, count: mine.length, expenses: mine };
}

/** Cross-owner debts: what the signed-in (linked) user owes, grouped by the owner's name. */
export function debtsByOwner(expenses: Expense[]) {
  const groups = new Map<string, { ownerName: string; expenses: Expense[] }>();
  for (const e of expenses) {
    const key = e.ownerId;
    if (!groups.has(key)) groups.set(key, { ownerName: e.ownerName, expenses: [] });
    groups.get(key)!.expenses.push(e);
  }
  return Array.from(groups.values()).map((g) => ({
    ...g,
    unpaidTotal: g.expenses
      .filter((e) => !e.paid)
      .reduce((sum, e) => sum + e.amount, 0),
  }));
}

export interface UpcomingDue {
  card: Card;
  dueDate: Date;
  daysUntil: number;
}

/** Cards whose next due date falls within `withinDays` (default 5), soonest first. */
export function upcomingDueDates(cards: Card[], withinDays = 5): UpcomingDue[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const results: UpcomingDue[] = [];
  for (const card of cards) {
    if (!card.dueDay) continue;
    const candidate = nextOccurrence(now, card.dueDay);
    const daysUntil = Math.round(
      (candidate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= withinDays) {
      results.push({ card, dueDate: candidate, daysUntil });
    }
  }
  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

function nextOccurrence(from: Date, dayOfMonth: number): Date {
  const clampedDay = Math.min(dayOfMonth, 28);
  let candidate = new Date(from.getFullYear(), from.getMonth(), clampedDay);
  if (candidate < from) {
    candidate = new Date(from.getFullYear(), from.getMonth() + 1, clampedDay);
  }
  return candidate;
}
