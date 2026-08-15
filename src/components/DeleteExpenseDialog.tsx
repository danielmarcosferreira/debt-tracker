"use client";

import { useState } from "react";
import { Sheet } from "./ui/Sheet";
import { Button } from "./ui/Button";
import { useLanguage } from "@/lib/language-context";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { deleteExpense, deleteExpenses } from "@/lib/data";
import type { Expense } from "@/lib/types";

interface DeleteExpenseDialogProps {
  /** The expense to delete, or null when the dialog should be closed. */
  expense: Expense | null;
  /** The full set of the owner's expenses, used to find future installments in the same group. */
  allExpenses: Expense[];
  onClose: () => void;
}

export function DeleteExpenseDialog({
  expense,
  allExpenses,
  onClose,
}: DeleteExpenseDialogProps) {
  const { t } = useLanguage();

  return (
    <Sheet open={!!expense} onClose={onClose} title={t("deleteExpense.title")}>
      {expense && (
        <DeleteExpenseForm
          key={expense.id}
          expense={expense}
          allExpenses={allExpenses}
          onClose={onClose}
        />
      )}
    </Sheet>
  );
}

function DeleteExpenseForm({
  expense,
  allExpenses,
  onClose,
}: {
  expense: Expense;
  allExpenses: Expense[];
  onClose: () => void;
}) {
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<"only" | "future">("only");
  const [deleting, setDeleting] = useState(false);

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

  const onConfirm = async () => {
    setDeleting(true);
    try {
      if (hasFuture && mode === "future") {
        await deleteExpenses([expense.id, ...future.map((e) => e.id)]);
      } else {
        await deleteExpense(expense.id);
      }
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-slate-50 px-3.5 py-3 dark:bg-slate-800">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {expense.description}
          {installment && (
            <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">
              {installment.index}/{installment.count}
            </span>
          )}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatDate(expense.date, language)} ·{" "}
          {formatCurrency(expense.amount, expense.currency)}
        </p>
      </div>

      {hasFuture && installment ? (
        <div className="flex flex-col gap-2">
          <RadioOption
            checked={mode === "only"}
            onSelect={() => setMode("only")}
            title={t("deleteExpense.onlyThis")}
            hint={t("deleteExpense.onlyThisHint", {
              index: installment.index,
              count: installment.count,
            })}
          />
          <RadioOption
            checked={mode === "future"}
            onSelect={() => setMode("future")}
            title={t("deleteExpense.thisAndFuture")}
            hint={t("deleteExpense.thisAndFutureHint", {
              index: installment.index,
              count: installment.count,
              remaining: future.length + 1,
            })}
          />
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("deleteExpense.simpleConfirm")}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          variant="danger"
          className="flex-1"
          loading={deleting}
          onClick={onConfirm}
        >
          {t("deleteExpense.delete")}
        </Button>
      </div>
    </div>
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
