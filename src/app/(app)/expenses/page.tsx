"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { CurrencyInput, Field, Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { MonthScopePicker } from "@/components/MonthScopePicker";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useMonthScope } from "@/lib/hooks";
import { useCards, usePeople, useExpenses, addExpense, markExpensePaid } from "@/lib/data";
import { formatCurrency, formatDate, todayISO } from "@/lib/utils";
import { categoryLabel } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/types";
import type { Category, CurrencyCode, Expense } from "@/lib/types";
import { DeleteExpenseDialog } from "@/components/DeleteExpenseDialog";
import { EditExpenseDialog } from "@/components/EditExpenseDialog";
import { Receipt, Plus, CheckCircle2, Circle, Pencil, Trash2, Search } from "lucide-react";

type StatusFilter = "all" | "unpaid" | "paid";
type PersonFilter = "all" | "me" | string;

export default function ExpensesPage() {
  return (
    <Suspense fallback={null}>
      <ExpensesContent />
    </Suspense>
  );
}

function ExpensesContent() {
  const { user } = useAuth();
  const { t, tc, language } = useLanguage();
  const searchParams = useSearchParams();
  const { cards } = useCards(user?.uid);
  const { people } = usePeople(user?.uid);
  const { expenses } = useExpenses(user?.uid);

  const [cardFilter, setCardFilter] = useState(searchParams.get("card") ?? "all");
  const [personFilter, setPersonFilter] = useState<PersonFilter>(
    (searchParams.get("person") as PersonFilter) ?? "all"
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const hasMonthParams = searchParams.has("scope") || searchParams.has("month");
  const monthScope = useMonthScope(
    hasMonthParams
      ? {
          scope: searchParams.get("scope") === "all" ? "all" : "month",
          monthKey: searchParams.get("month"),
        }
      : undefined,
    "monthScope:expenses"
  );
  const { monthKey } = monthScope;

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (monthKey && e.date.slice(0, 7) !== monthKey) return false;
      if (cardFilter !== "all" && e.cardId !== cardFilter) return false;
      if (personFilter === "me" && !e.forSelf) return false;
      if (personFilter !== "all" && personFilter !== "me" && e.personId !== personFilter)
        return false;
      if (statusFilter === "unpaid" && e.paid) return false;
      if (statusFilter === "paid" && !e.paid) return false;
      if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [expenses, monthKey, cardFilter, personFilter, statusFilter, search]);

  const monthHasAnyExpenses = useMemo(
    () => expenses.some((e) => !monthKey || e.date.slice(0, 7) === monthKey),
    [expenses, monthKey]
  );
  const hasOtherFiltersActive =
    search !== "" || cardFilter !== "all" || personFilter !== "all" || statusFilter !== "all";

  const totals = useMemo(() => {
    const totalsMap: Partial<Record<CurrencyCode, number>> = {};
    for (const e of filtered) totalsMap[e.currency] = (totalsMap[e.currency] ?? 0) + e.amount;
    return totalsMap;
  }, [filtered]);
  const totalsLabel = Object.entries(totals)
    .map(([code, amt]) => formatCurrency(amt, code as CurrencyCode))
    .join(" + ") || formatCurrency(0);

  const statusLabels: Record<StatusFilter, string> = {
    all: t("common.filterAll"),
    unpaid: t("common.filterUnpaid"),
    paid: t("common.filterPaid"),
  };

  return (
    <>
      <TopBar
        title={t("expenses.title")}
        subtitle={tc("expenses.shown", filtered.length, { total: totalsLabel })}
      />

      <main className="px-5 pt-5">
        <Button onClick={() => setSheetOpen(true)} className="mb-4 w-full">
          <Plus className="h-4 w-4" /> {t("expenses.addExpense")}
        </Button>

        <MonthScopePicker {...monthScope} />

        <div className="mb-4 flex flex-col gap-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("expenses.searchPlaceholder")}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Select value={cardFilter} onChange={(e) => setCardFilter(e.target.value)}>
              <option value="all">{t("expenses.allCards")}</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value as PersonFilter)}
            >
              <option value="all">{t("expenses.everyone")}</option>
              <option value="me">{t("expenses.meOnly")}</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex gap-2">
            {(["all", "unpaid", "paid"] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition ${
                  statusFilter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {statusLabels[f]}
              </button>
            ))}
          </div>
        </div>

        {expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t("expenses.emptyTitle")}
            description={t("expenses.emptyDesc")}
          />
        ) : filtered.length === 0 && !monthHasAnyExpenses && !hasOtherFiltersActive ? (
          <EmptyState
            icon={Receipt}
            title={t("expenses.noneThisMonth")}
            description={t("expenses.noneThisMonthDesc")}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title={t("expenses.noMatchesTitle")}
            description={t("expenses.noMatchesDesc")}
          />
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {filtered.map((e) => {
              const person = people.find((p) => p.id === e.personId);
              return (
                <div key={e.id} className="flex items-center gap-3 p-3.5">
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
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(e.date, language)} · {e.cardName} ·{" "}
                      {person?.name ?? t("expenses.you")}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatCurrency(e.amount, e.currency)}
                  </p>
                  <button
                    onClick={() => setEditingExpense(e)}
                    className="shrink-0 rounded-full p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingExpense(e)}
                    className="shrink-0 rounded-full p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ExpenseFormSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        defaultCardId={cardFilter !== "all" ? cardFilter : undefined}
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

function ExpenseFormSheet({
  open,
  onClose,
  defaultCardId,
}: {
  open: boolean;
  onClose: () => void;
  defaultCardId?: string;
}) {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const { cards } = useCards(user?.uid);
  const { people } = usePeople(user?.uid);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [cardId, setCardId] = useState(defaultCardId ?? "");
  const [personId, setPersonId] = useState("");
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [date, setDate] = useState(todayISO());
  const [installments, setInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("2");
  const [installmentStart, setInstallmentStart] = useState("1");
  const [saving, setSaving] = useState(false);

  const selectedCard = cards.find((c) => c.id === cardId);
  const isOngoingInstallment = installments && Number(installmentStart) > 1;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !description.trim() || !amount || !cardId || !selectedCard) return;
    setSaving(true);
    try {
      const person = people.find((p) => p.id === personId);
      await addExpense({
        ownerId: user.uid,
        cardId,
        cardName: selectedCard.name,
        ownerName: profile?.name ?? user.displayName ?? "",
        personId: personId || null,
        forSelf: !personId,
        linkedUserId: person?.linkedUserId ?? null,
        description: description.trim(),
        amount: Number(amount),
        currency: selectedCard.currency,
        category,
        date,
        installmentCount: installments ? Number(installmentCount) : 1,
        installmentStart: installments ? Number(installmentStart) : undefined,
      });
      setDescription("");
      setAmount("");
      setPersonId("");
      setInstallments(false);
      setInstallmentStart("1");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (cards.length === 0) {
    return (
      <Sheet open={open} onClose={onClose} title={t("expenses.addExpense")}>
        <EmptyState
          icon={Receipt}
          title={t("expenses.addCardFirstTitle")}
          description={t("expenses.addCardFirstDesc")}
        />
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("expenses.addExpense")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={t("expenseForm.description")} htmlFor="description">
          <Input
            id="description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("expenseForm.descriptionPlaceholder")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <Field
            label={
              !installments
                ? t("expenseForm.amount")
                : isOngoingInstallment
                  ? t("expenseForm.amountPerInstallment")
                  : t("expenseForm.amountTotal")
            }
            htmlFor="amount"
          >
            <CurrencyInput
              id="amount"
              required
              value={amount}
              onChange={setAmount}
              currency={selectedCard?.currency ?? profile?.defaultCurrency ?? "USD"}
            />
          </Field>
          <Field label={t("expenseForm.date")} htmlFor="date">
            <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        {isOngoingInstallment && (
          <p className="-mt-2 text-xs text-slate-400 dark:text-slate-500">
            {t("expenseForm.dateForInstallmentHint")}
          </p>
        )}
        <Field label={t("expenseForm.card")} htmlFor="card">
          <Select id="card" required value={cardId} onChange={(e) => setCardId(e.target.value)}>
            <option value="" disabled>
              {t("expenseForm.selectCard")}
            </option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.currency})
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("expenseForm.whoFor")} htmlFor="person">
          <Select id="person" value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">{t("expenseForm.meOwn")}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("expenseForm.category")} htmlFor="category">
          <Select id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(language, c)}
              </option>
            ))}
          </Select>
        </Field>

        <label className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 dark:bg-slate-800">
          <input
            type="checkbox"
            checked={installments}
            onChange={(e) => setInstallments(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("expenseForm.splitInstallments")}
          </span>
        </label>
        {installments && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("expenseForm.installmentStart")} htmlFor="installmentStart">
                <Input
                  id="installmentStart"
                  type="number"
                  min="1"
                  max={installmentCount}
                  value={installmentStart}
                  onChange={(e) => setInstallmentStart(e.target.value)}
                />
              </Field>
              <Field label={t("expenseForm.installmentCount")} htmlFor="installmentCount">
                <Input
                  id="installmentCount"
                  type="number"
                  min="2"
                  max="60"
                  value={installmentCount}
                  onChange={(e) => {
                    setInstallmentCount(e.target.value);
                    const count = Number(e.target.value);
                    if (count > 0 && Number(installmentStart) > count) {
                      setInstallmentStart(e.target.value);
                    }
                  }}
                />
              </Field>
            </div>
            <p className="-mt-2 text-xs text-slate-400 dark:text-slate-500">
              {t("expenseForm.installmentStartHint")}
            </p>
          </>
        )}

        <Button type="submit" loading={saving} className="mt-2 w-full">
          {t("expenseForm.submit")}
        </Button>
      </form>
    </Sheet>
  );
}
