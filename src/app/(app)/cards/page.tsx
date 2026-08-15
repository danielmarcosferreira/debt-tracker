"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useCards, useExpenses, addCard, updateCard, deleteCard } from "@/lib/data";
import { cardBalance } from "@/lib/aggregates";
import { formatCurrency } from "@/lib/utils";
import { CARD_COLORS, CURRENCIES } from "@/lib/types";
import type { Card, CurrencyCode } from "@/lib/types";
import { CreditCard, Plus, Pencil, Trash2 } from "lucide-react";

export default function CardsPage() {
  const { user } = useAuth();
  const { t, tc } = useLanguage();
  const { cards } = useCards(user?.uid);
  const { expenses } = useExpenses(user?.uid);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (card: Card) => {
    setEditing(card);
    setSheetOpen(true);
  };

  const onDelete = async (card: Card) => {
    if (!confirm(t("cards.deleteConfirm", { name: card.name }))) return;
    await deleteCard(card.id);
  };

  return (
    <>
      <TopBar title={t("cards.title")} subtitle={tc("cards.count", cards.length)} />

      <main className="px-5 pt-5">
        <Button onClick={openNew} className="mb-4 w-full">
          <Plus className="h-4 w-4" /> {t("cards.addCard")}
        </Button>

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
                      href={`/expenses?card=${card.id}`}
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
                        onClick={() => onDelete(card)}
                        className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

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
              );
            })}
          </div>
        )}
      </main>

      <CardFormSheet open={sheetOpen} onClose={() => setSheetOpen(false)} editing={editing} />
    </>
  );
}

function CardFormSheet({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Card | null;
}) {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState(editing?.name ?? "");
  const [bank, setBank] = useState(editing?.bank ?? "");
  const [last4, setLast4] = useState(editing?.last4 ?? "");
  const [limit, setLimit] = useState(editing?.limit?.toString() ?? "");
  const [dueDay, setDueDay] = useState(editing?.dueDay?.toString() ?? "");
  const [color, setColor] = useState(editing?.color ?? CARD_COLORS[0]);
  const [currency, setCurrency] = useState<CurrencyCode>(
    editing?.currency ?? profile?.defaultCurrency ?? "USD"
  );
  const [saving, setSaving] = useState(false);

  const key = editing?.id ?? "new";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        bank: bank.trim() || undefined,
        last4: last4.trim() || undefined,
        limit: limit ? Number(limit) : undefined,
        dueDay: dueDay ? Number(dueDay) : undefined,
        color,
        currency,
      };
      if (editing) {
        await updateCard(editing.id, data);
      } else {
        await addCard(user.uid, data);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? t("cardForm.editTitle") : t("cardForm.addTitle")}
    >
      <form key={key} onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={t("cardForm.name")} htmlFor="cardName">
          <Input
            id="cardName"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("cardForm.namePlaceholder")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("cardForm.bank")} htmlFor="bank">
            <Input
              id="bank"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder={t("cardForm.bankPlaceholder")}
            />
          </Field>
          <Field label={t("cardForm.last4")} htmlFor="last4">
            <Input
              id="last4"
              value={last4}
              maxLength={4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
              placeholder="1234"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("cardForm.limit")} htmlFor="limit">
            <Input
              id="limit"
              type="number"
              min="0"
              step="0.01"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="5000"
            />
          </Field>
          <Field label={t("cardForm.currency")} htmlFor="currency">
            <Select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("cardForm.dueDay")} htmlFor="dueDay">
          <Input
            id="dueDay"
            type="number"
            min="1"
            max="31"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            placeholder="5"
          />
        </Field>
        <Field label={t("cardForm.color")} htmlFor="color">
          <div className="flex flex-wrap gap-2">
            {CARD_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full ring-offset-2 transition dark:ring-offset-slate-900 ${color === c ? "ring-2 ring-slate-900 dark:ring-white" : ""}`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>

        <Button type="submit" loading={saving} className="mt-2 w-full">
          {editing ? t("cardForm.submitSave") : t("cardForm.submitAdd")}
        </Button>
      </form>
    </Sheet>
  );
}
