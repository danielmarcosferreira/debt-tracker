"use client";

import { useState } from "react";
import { Sheet } from "./ui/Sheet";
import { Button } from "./ui/Button";
import { CurrencyInput, Field, Input, Select } from "./ui/Input";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { updateExpenseWithScope } from "@/lib/data";
import { categoryLabel } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/types";
import type { Card, Category, Expense, Person } from "@/lib/types";

interface EditExpenseDialogProps {
  /** The expense to edit, or null when the dialog should be closed. */
  expense: Expense | null;
  /** The full set of the owner's expenses, used to find future installments in the same group. */
  allExpenses: Expense[];
  cards: Card[];
  people: Person[];
  onClose: () => void;
}

export function EditExpenseDialog({
  expense,
  allExpenses,
  cards,
  people,
  onClose,
}: EditExpenseDialogProps) {
  const { t } = useLanguage();

  return (
    <Sheet open={!!expense} onClose={onClose} title={t("editExpense.title")}>
      {expense && (
        <EditExpenseForm
          key={expense.id}
          expense={expense}
          allExpenses={allExpenses}
          cards={cards}
          people={people}
          onClose={onClose}
        />
      )}
    </Sheet>
  );
}

function EditExpenseForm({
  expense,
  allExpenses,
  cards,
  people,
  onClose,
}: {
  expense: Expense;
  allExpenses: Expense[];
  cards: Card[];
  people: Person[];
  onClose: () => void;
}) {
  const { t, language } = useLanguage();
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [date, setDate] = useState(expense.date);
  const [cardId, setCardId] = useState(expense.cardId);
  const [personId, setPersonId] = useState(expense.personId ?? "");
  const [category, setCategory] = useState<Category>(expense.category);
  const [mode, setMode] = useState<"only" | "future">("only");
  const [saving, setSaving] = useState(false);

  const selectedCard = cards.find((c) => c.id === cardId);
  const installment = expense.installment ?? null;
  const future = installment
    ? allExpenses.filter(
        (e) =>
          e.id !== expense.id &&
          e.installment?.groupId === installment.groupId &&
          e.installment.index > installment.index
      )
    : [];
  const hasFuture = future.length > 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !selectedCard) return;
    setSaving(true);
    try {
      const person = people.find((p) => p.id === personId);
      await updateExpenseWithScope(
        expense.id,
        date,
        {
          description: description.trim(),
          amount: Number(amount),
          cardId,
          cardName: selectedCard.name,
          currency: selectedCard.currency,
          personId: personId || null,
          forSelf: !personId,
          linkedUserId: person?.linkedUserId ?? null,
          category,
        },
        hasFuture && mode === "future" ? future.map((f) => f.id) : []
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label={t("expenseForm.description")} htmlFor="editDescription">
        <Input
          id="editDescription"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("expenseForm.amount")} htmlFor="editAmount">
          <CurrencyInput
            id="editAmount"
            required
            value={amount}
            onChange={setAmount}
            currency={selectedCard?.currency ?? expense.currency}
          />
        </Field>
        <Field label={t("expenseForm.date")} htmlFor="editDate">
          <Input
            id="editDate"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>
      <Field label={t("expenseForm.card")} htmlFor="editCard">
        <Select id="editCard" required value={cardId} onChange={(e) => setCardId(e.target.value)}>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.currency})
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("expenseForm.whoFor")} htmlFor="editPerson">
        <Select id="editPerson" value={personId} onChange={(e) => setPersonId(e.target.value)}>
          <option value="">{t("expenseForm.meOwn")}</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("expenseForm.category")} htmlFor="editCategory">
        <Select
          id="editCategory"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(language, c)}
            </option>
          ))}
        </Select>
      </Field>

      {hasFuture && installment && (
        <div className="flex flex-col gap-2">
          <RadioOption
            checked={mode === "only"}
            onSelect={() => setMode("only")}
            title={t("editExpense.onlyThis")}
            hint={t("editExpense.onlyThisHint", {
              index: installment.index,
              count: installment.count,
            })}
          />
          <RadioOption
            checked={mode === "future"}
            onSelect={() => setMode("future")}
            title={t("editExpense.thisAndFuture")}
            hint={t("editExpense.thisAndFutureHint", {
              index: installment.index,
              count: installment.count,
              remaining: future.length + 1,
            })}
          />
        </div>
      )}

      <Button type="submit" loading={saving} className="mt-2 w-full">
        {t("editExpense.save")}
      </Button>
    </form>
  );
}

function RadioOption({
  checked,
  onSelect,
  title,
  hint,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition",
        checked
          ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      )}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 focus:ring-indigo-500"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
    </label>
  );
}
