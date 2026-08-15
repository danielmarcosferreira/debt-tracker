import { clsx, type ClassValue } from "clsx";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CURRENCIES, type CurrencyCode, type LanguageCode } from "./types";
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
