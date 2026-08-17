"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardFormSheet } from "@/components/CardFormSheet";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useCards, useExpenses, deleteCard } from "@/lib/data";
import { cardBalance } from "@/lib/aggregates";
import { formatCurrency } from "@/lib/utils";
import type { Card } from "@/lib/types";
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

      <main className="px-2 pt-5">
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
                      href={`/cards/detail?id=${card.id}`}
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

                  <Link href={`/cards/detail?id=${card.id}`} className="block">
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
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <CardFormSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        editing={editing}
      />
    </>
  );
}
