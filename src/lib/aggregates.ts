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

/** Groups expenses by the card they're on, each with its own summed total (safe since a card's expenses share its currency). */
export function groupByCard(expenses: Expense[]) {
  const groups = new Map<string, { cardId: string; cardName: string; expenses: Expense[] }>();
  for (const e of expenses) {
    if (!groups.has(e.cardId)) groups.set(e.cardId, { cardId: e.cardId, cardName: e.cardName, expenses: [] });
    groups.get(e.cardId)!.expenses.push(e);
  }
  return Array.from(groups.values())
    .map((g) => ({ ...g, total: g.expenses.reduce((sum, e) => sum + e.amount, 0) }))
    .sort((a, b) => b.total - a.total);
}

export interface CardMonthTotal {
  card: Card;
  total: number;
  count: number;
  dueDate: Date | null;
  daysUntil: number | null;
  overdue: boolean;
  paid: boolean;
}

/**
 * Per-card totals for a set of already month/scope-filtered expenses, largest
 * total first. Sums every expense in scope regardless of its own `paid`
 * flag, since that tracks reimbursement from the person it's for, not
 * whether the card issuer has been paid — that's `card.paidInvoiceCycles`
 * instead. By default a card whose invoice for `monthKey` is already marked
 * paid is omitted; pass `includePaid: true` to list those too (each flagged
 * via the returned `paid` field).
 */
export function cardTotalsInScope(
  cards: Card[],
  expenses: Expense[],
  monthKey: string | null,
  includePaid = false
): CardMonthTotal[] {
  const cardsById = new Map(cards.map((c) => [c.id, c]));
  const totals = new Map<string, { card: Card; total: number; count: number }>();
  for (const e of expenses) {
    const card = cardsById.get(e.cardId);
    if (!card) continue;
    const paid = !!(monthKey && card.paidInvoiceCycles?.includes(monthKey));
    if (paid && !includePaid) continue;
    const entry = totals.get(card.id) ?? { card, total: 0, count: 0 };
    entry.total += e.amount;
    entry.count += 1;
    totals.set(card.id, entry);
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return Array.from(totals.values())
    .filter((entry) => entry.total !== 0)
    .map((entry) => {
      const paid = !!(monthKey && entry.card.paidInvoiceCycles?.includes(monthKey));
      if (!monthKey || !entry.card.dueDay) {
        return { ...entry, dueDate: null, daysUntil: null, overdue: false, paid };
      }
      const dueDate = dueDateForMonth(monthKey, entry.card.dueDay);
      const daysUntil = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { ...entry, dueDate, daysUntil, overdue: daysUntil < 0 && !paid, paid };
    })
    .sort((a, b) => b.total - a.total);
}

/** Groups expenses by their "yyyy-MM" month, newest first, each with its own summed total. */
export function groupByMonth(expenses: Expense[]) {
  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = e.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return Array.from(groups.entries())
    .map(([monthKey, monthExpenses]) => ({
      monthKey,
      expenses: monthExpenses,
      total: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

/**
 * Groups expenses by their card's due day (statement day of month), then by
 * card within each due-day bucket — so "everything due on the 5th" (which
 * may span several cards that all bill on that day) sits together, with
 * "everything due on the 10th" below it. Cards without a due day land in a
 * trailing bucket. Sorted by due day ascending.
 */
export function groupByDueDay(expenses: Expense[], cards: Card[]) {
  const dueDayByCard = new Map(cards.map((c) => [c.id, c.dueDay ?? null]));
  const buckets = new Map<number | null, Expense[]>();
  for (const e of expenses) {
    const day = dueDayByCard.get(e.cardId) ?? null;
    if (!buckets.has(day)) buckets.set(day, []);
    buckets.get(day)!.push(e);
  }
  return Array.from(buckets.entries())
    .map(([dueDay, dayExpenses]) => ({
      dueDay,
      cardGroups: groupByCard(dayExpenses),
      total: sumByCurrency(dayExpenses, () => true),
    }))
    .sort((a, b) => {
      if (a.dueDay === null) return 1;
      if (b.dueDay === null) return -1;
      return a.dueDay - b.dueDay;
    });
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
  overdue: boolean;
  /** "yyyy-MM" of the unpaid invoice this alert is about — link into that month on the card's detail page. */
  monthKey: string;
}

/**
 * Cards with an unpaid invoice due within `withinDays` (default 5) or already
 * overdue, most urgent first. Driven by `card.paidInvoiceCycles` (not just a
 * date calculation, and not by each expense's own `paid` flag, which tracks
 * reimbursement from the person it's for rather than whether the card issuer
 * has been paid): a card's oldest month with activity that hasn't been
 * marked paid is treated as its current invoice, so a missed payment keeps
 * surfacing as overdue instead of silently rolling over to next month's due
 * date. Clears once that month is explicitly marked paid.
 */
export function upcomingDueDates(cards: Card[], expenses: Expense[], withinDays = 5): UpcomingDue[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const results: UpcomingDue[] = [];
  for (const card of cards) {
    if (!card.dueDay) continue;
    const monthsWithActivity = new Set(
      expenses.filter((e) => e.cardId === card.id).map((e) => e.date.slice(0, 7))
    );
    const unpaidMonths = Array.from(monthsWithActivity).filter(
      (m) => !card.paidInvoiceCycles?.includes(m)
    );
    if (unpaidMonths.length === 0) continue;

    const monthKey = unpaidMonths.sort()[0];
    const dueDate = dueDateForMonth(monthKey, card.dueDay);
    const daysUntil = Math.round(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= withinDays) {
      results.push({ card, dueDate, daysUntil, overdue: daysUntil < 0, monthKey });
    }
  }
  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

function dueDateForMonth(monthKey: string, dayOfMonth: number): Date {
  const [year, month] = monthKey.split("-").map(Number);
  const clampedDay = Math.min(dayOfMonth, 28);
  return new Date(year, month - 1, clampedDay);
}
