"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import {
  useCards,
  usePeople,
  useExpenses,
  updatePerson,
  deletePerson,
  markExpensePaid,
} from "@/lib/data";
import { personTotals, groupByMonth } from "@/lib/aggregates";
import { useMonthScope } from "@/lib/hooks";
import { expensesInMonth, formatCurrency, formatDate, formatMonthYear, initials } from "@/lib/utils";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { MonthScopePicker } from "@/components/MonthScopePicker";
import { DeleteExpenseDialog } from "@/components/DeleteExpenseDialog";
import { EditExpenseDialog } from "@/components/EditExpenseDialog";
import { PERSON_COLORS } from "@/lib/types";
import type { Expense, LanguageCode } from "@/lib/types";
import { exportPersonStatement } from "@/lib/pdf";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Receipt,
  CheckCircle2,
  Circle,
  FileDown,
  Link2,
} from "lucide-react";

type Filter = "all" | "unpaid" | "paid";

export default function PersonDetailPage() {
  return (
    <Suspense fallback={null}>
      <PersonDetail />
    </Suspense>
  );
}

function PersonDetail() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const { people } = usePeople(user?.uid);
  const { cards } = useCards(user?.uid);
  const { expenses } = useExpenses(user?.uid);
  const [filter, setFilter] = useState<Filter>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const monthScope = useMonthScope(undefined, "monthScope:people-detail");

  const person = people.find((p) => p.id === id);
  const { expenses: all } = useMemo(() => personTotals(id, expenses), [id, expenses]);

  const monthScoped = expensesInMonth(all, monthScope.monthKey);
  const owed = monthScoped.filter((e) => !e.paid).reduce((sum, e) => sum + e.amount, 0);
  const paid = monthScoped.filter((e) => e.paid).reduce((sum, e) => sum + e.amount, 0);

  const filtered = monthScoped.filter((e) => {
    if (filter === "unpaid") return !e.paid;
    if (filter === "paid") return e.paid;
    return true;
  });
  const monthGroups = monthScope.scope === "all" ? groupByMonth(filtered) : null;

  const filterLabels: Record<Filter, string> = {
    all: t("common.filterAll"),
    unpaid: t("common.filterUnpaid"),
    paid: t("common.filterPaid"),
  };

  if (!person) {
    return (
      <main className="px-5 pt-5">
        <button
          onClick={() => router.push("/people")}
          className="mb-4 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" /> {t("peopleDetail.back2")}
        </button>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("peopleDetail.notFound")}
        </p>
      </main>
    );
  }

  const currency = all[0]?.currency ?? profile?.defaultCurrency ?? "USD";

  const onDelete = async () => {
    if (!confirm(t("peopleDetail.deleteConfirm", { name: person.name }))) return;
    await deletePerson(person.id);
    router.push("/people");
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto max-w-lg">
          <Link
            href="/people"
            className="mb-3 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
          >
            <ArrowLeft className="h-4 w-4" /> {t("peopleDetail.back")}
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white"
              style={{ backgroundColor: person.color }}
            >
              {initials(person.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {person.name}
                </h1>
                {person.linkedUserId && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <Link2 className="h-3 w-3" /> {t("peopleDetail.linked")}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("peopleDetail.unpaidAndPaid", {
                  unpaid: formatCurrency(owed, currency),
                  paid: formatCurrency(paid, currency),
                })}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => exportPersonStatement(person, all, profile?.name ?? "", language)}
                disabled={all.length === 0}
                title={t("peopleDetail.exportPdf")}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <FileDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => setEditOpen(true)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-5 pt-5">
        <MonthScopePicker {...monthScope} />

        <div className="mb-4 flex gap-2">
          {(["all", "unpaid", "paid"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t("peopleDetail.emptyTitle")}
            description={
              filter === "all"
                ? t("peopleDetail.emptyDescAll", { name: person.name })
                : t("peopleDetail.emptyDescFiltered", {
                    filter: filterLabels[filter],
                    name: person.name,
                  })
            }
          />
        ) : monthGroups ? (
          <div className="flex flex-col gap-3">
            {monthGroups.map((mg) => (
              <div
                key={mg.monthKey}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 dark:bg-slate-800/50">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {formatMonthYear(mg.monthKey, language)}
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                    {formatCurrency(mg.total, mg.expenses[0]?.currency)}
                  </p>
                </div>
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                  {mg.expenses.map((e) => (
                    <ExpenseRow
                      key={e.id}
                      expense={e}
                      language={language}
                      onEdit={() => setEditingExpense(e)}
                      onDelete={() => setDeletingExpense(e)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {filtered.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                language={language}
                onEdit={() => setEditingExpense(e)}
                onDelete={() => setDeletingExpense(e)}
              />
            ))}
          </div>
        )}
      </main>

      <EditPersonSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        person={person}
      />
      <EditExpenseDialog
        expense={editingExpense}
        allExpenses={expenses}
        cards={cards}
        people={people}
        onClose={() => setEditingExpense(null)}
      />
      <DeleteExpenseDialog
        expense={deletingExpense}
        allExpenses={expenses}
        onClose={() => setDeletingExpense(null)}
      />
    </>
  );
}

function ExpenseRow({
  expense: e,
  language,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  language: LanguageCode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 p-3.5">
      <button
        onClick={() => markExpensePaid(e.id, !e.paid)}
        className="shrink-0 text-slate-300 transition hover:text-emerald-500 dark:text-slate-600"
        title={e.paid ? t("common.markUnpaid") : t("common.markPaid")}
      >
        {e.paid ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        ) : (
          <Circle className="h-6 w-6" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {e.description}
          {e.installment && (
            <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">
              {e.installment.index}/{e.installment.count}
            </span>
          )}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatDate(e.date, language)} · {e.cardName}
        </p>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {formatCurrency(e.amount, e.currency)}
      </p>
      <button
        onClick={onEdit}
        className="shrink-0 rounded-full p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={onDelete}
        className="shrink-0 rounded-full p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function EditPersonSheet({
  open,
  onClose,
  person,
}: {
  open: boolean;
  onClose: () => void;
  person: { id: string; name: string; color: string; inviteEmail?: string | null };
}) {
  const { t } = useLanguage();
  const [name, setName] = useState(person.name);
  const [inviteEmail, setInviteEmail] = useState(person.inviteEmail ?? "");
  const [color, setColor] = useState(person.color);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updatePerson(person.id, {
        name: name.trim(),
        color,
        inviteEmail: inviteEmail.trim().toLowerCase() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("personForm.editTitle")}>
      <form key={person.id} onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={t("personForm.name")} htmlFor="editName">
          <Input id="editName" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t("personForm.email")} htmlFor="editInviteEmail">
          <Input
            id="editInviteEmail"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t("personForm.emailPlaceholder")}
          />
        </Field>
        <Field label={t("personForm.color")} htmlFor="editColor">
          <div className="flex flex-wrap gap-2">
            {PERSON_COLORS.map((c) => (
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
          {t("personForm.saveChanges")}
        </Button>
      </form>
    </Sheet>
  );
}
