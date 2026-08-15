export const CARD_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#334155",
];

export const PERSON_COLORS = [
  "#f97316",
  "#84cc16",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
];

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "BRL", symbol: "R$", label: "Brazilian Real" },
  { code: "GBP", symbol: "£", label: "British Pound" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const CATEGORIES = [
  "Food",
  "Shopping",
  "Travel",
  "Bills",
  "Entertainment",
  "Health",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  defaultCurrency: CurrencyCode;
  language: LanguageCode;
  createdAt: number;
}

export interface Card {
  id: string;
  ownerId: string;
  name: string;
  bank?: string;
  last4?: string;
  color: string;
  limit?: number;
  currency: CurrencyCode;
  /** Day of month (1-31) the statement/bill is due. */
  dueDay?: number;
  createdAt: number;
}

export interface Person {
  id: string;
  ownerId: string;
  name: string;
  color: string;
  /** Email of an invited person who can link their own account to see what they owe. */
  inviteEmail?: string | null;
  /** Set once the invited person links their account. */
  linkedUserId?: string | null;
  createdAt: number;
}

export interface InstallmentInfo {
  groupId: string;
  index: number;
  count: number;
}

export interface Expense {
  id: string;
  ownerId: string;
  cardId: string;
  /** null when the expense is the owner's own (forSelf). */
  personId: string | null;
  forSelf: boolean;
  /** Denormalized from the linked person, kept in sync client-side, used by security rules for cross-account reads. */
  linkedUserId?: string | null;
  /** Denormalized display fields so a linked (non-owner) person can render context they don't have direct read access to. */
  cardName: string;
  ownerName: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  category: Category;
  /** ISO date string, yyyy-MM-dd. */
  date: string;
  paid: boolean;
  installment?: InstallmentInfo | null;
  createdAt: number;
}
