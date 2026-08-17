"use client";

import { useState } from "react";
import { Sheet } from "./ui/Sheet";
import { Button } from "./ui/Button";
import { Field, Input, Select } from "./ui/Input";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { addCard, updateCard } from "@/lib/data";
import { CARD_COLORS, CURRENCIES } from "@/lib/types";
import type { Card, CurrencyCode } from "@/lib/types";

export function CardFormSheet({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Card | null;
}) {
  const { t } = useLanguage();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? t("cardForm.editTitle") : t("cardForm.addTitle")}
    >
      {/*
        key forces a fresh form instance (and fresh useState initializers)
        whenever the target card changes — otherwise the sheet stays the same
        component instance across renders and its fields stay frozen at
        whatever `editing` was on first mount.
      */}
      <CardForm key={editing?.id ?? "new"} onClose={onClose} editing={editing} />
    </Sheet>
  );
}

function CardForm({ onClose, editing }: { onClose: () => void; editing: Card | null }) {
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
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
  );
}
