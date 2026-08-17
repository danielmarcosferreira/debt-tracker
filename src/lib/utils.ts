import { clsx, type ClassValue } from "clsx";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CURRENCIES, type CurrencyCode, type Expense, type LanguageCode } from "./types";
import { translate, type TranslationKey } from "./i18n";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function currencySymbol(code: CurrencyCode) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function formatCurrency(amount: number, code: CurrencyCode = "USD") {
  const symbol = currencySymbol(code);
  const value = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? "-" : ""}${symbol}${value}`;
}

export function formatDate(iso: string, language: LanguageCode = "en") {
  try {
    const date = parseISO(iso);
    return language === "pt"
      ? format(date, "d 'de' MMM 'de' yyyy", { locale: ptBR })
      : format(date, "MMM d, yyyy");
  } catch {
    return iso;
  }
}

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

/** "yyyy-MM" for the current month. */
export function currentMonthKey() {
  return format(new Date(), "yyyy-MM");
}

/** Shifts a "yyyy-MM" key by `delta` months (can be negative). */
export function addMonthsToKey(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return format(d, "yyyy-MM");
}

/** "August 2026" / "Agosto de 2026" for a "yyyy-MM" key. */
export function formatMonthYear(key: string, language: LanguageCode = "en") {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const formatted =
    language === "pt"
      ? format(d, "MMMM 'de' yyyy", { locale: ptBR })
      : format(d, "MMMM yyyy");
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Expenses dated within `monthKey` ("yyyy-MM"); returns `expenses` unchanged when `monthKey` is null. */
export function expensesInMonth(expenses: Expense[], monthKey: string | null): Expense[] {
  if (!monthKey) return expenses;
  return expenses.filter((e) => e.date.slice(0, 7) === monthKey);
}

/**
 * Expenses matching a month/all-time scope picker's current selection: an
 * exact month when `scope` is "month", or "today onward" when `scope` is
 * "all" — deliberately excluding months before the current one, so "All"
 * reads as everything outstanding now and in the future (e.g. the rest of
 * an installment plan), not the full historical ledger back to day one.
 * `todayMonthKey` comes from `useTodayMonthKey()`; while it's still null
 * (hydration not resolved yet), "all" falls back to showing everything
 * rather than filtering out expenses prematurely.
 */
export function expensesInScope(
  expenses: Expense[],
  scope: "month" | "all",
  monthKey: string | null,
  todayMonthKey: string | null
): Expense[] {
  if (scope === "month") return expensesInMonth(expenses, monthKey);
  if (!todayMonthKey) return expenses;
  return expenses.filter((e) => e.date.slice(0, 7) >= todayMonthKey);
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function newId() {
  return crypto.randomUUID();
}

const AUTH_ERROR_KEYS: Record<string, TranslationKey> = {
  "auth/invalid-email": "errors.invalidEmail",
  "auth/user-not-found": "errors.userNotFound",
  "auth/wrong-password": "errors.wrongPassword",
  "auth/invalid-credential": "errors.invalidCredential",
  "auth/email-already-in-use": "errors.emailInUse",
  "auth/weak-password": "errors.weakPassword",
  "auth/too-many-requests": "errors.tooManyRequests",
};

export function friendlyAuthError(err: unknown, language: LanguageCode = "en"): string {
  const code = (err as { code?: string })?.code;
  const key = code ? AUTH_ERROR_KEYS[code] : undefined;
  return translate(language, key ?? "errors.generic");
}
