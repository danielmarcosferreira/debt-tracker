"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { usePeople, useExpenses, addPerson } from "@/lib/data";
import { personTotals } from "@/lib/aggregates";
import { formatCurrency, initials } from "@/lib/utils";
import { PERSON_COLORS } from "@/lib/types";
import { Users, Plus, ChevronRight, Link2 } from "lucide-react";

export default function PeoplePage() {
  const { user, profile } = useAuth();
  const { t, tc } = useLanguage();
  const { people } = usePeople(user?.uid);
  const { expenses } = useExpenses(user?.uid);
  const [sheetOpen, setSheetOpen] = useState(false);
  const fallbackCurrency = profile?.defaultCurrency ?? "USD";

  return (
    <>
      <TopBar title={t("people.title")} subtitle={tc("people.count", people.length)} />

      <main className="px-2 pt-5">
        <Button onClick={() => setSheetOpen(true)} className="mb-4 w-full">
          <Plus className="h-4 w-4" /> {t("people.addPerson")}
        </Button>

        {people.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("people.emptyTitle")}
            description={t("people.emptyDesc")}
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {people.map((p) => {
              const { owed, paid, count, expenses: personExpenses } = personTotals(
                p.id,
                expenses
              );
              const currency = personExpenses[0]?.currency ?? fallbackCurrency;
              return (
                <Link
                  href={`/people/detail?id=${p.id}`}
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {initials(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {p.name}
                      </p>
                      {p.linkedUserId && (
                        <Link2
                          className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                          aria-label={t("people.linkedAccountAria")}
                        />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tc("people.expenseCount", count)} ·{" "}
                      {t("people.paid", { amount: formatCurrency(paid, currency) })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold tabular-nums ${owed > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"}`}
                    >
                      {formatCurrency(owed, currency)}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {t("people.owes")}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <PersonFormSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

function PersonFormSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [color, setColor] = useState(PERSON_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      await addPerson(user.uid, { name: name.trim(), color, inviteEmail: inviteEmail.trim() || null });
      setName("");
      setInviteEmail("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("personForm.addTitle")} preventClose={saving}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={t("personForm.name")} htmlFor="personName">
          <Input
            id="personName"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("personForm.namePlaceholder")}
          />
        </Field>
        <Field label={t("personForm.email")} htmlFor="inviteEmail">
          <Input
            id="inviteEmail"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t("personForm.emailPlaceholder")}
          />
        </Field>
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          {t("personForm.emailHint")}
        </p>
        <Field label={t("personForm.color")} htmlFor="personColor">
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
          {t("personForm.submit")}
        </Button>
      </form>
    </Sheet>
  );
}
