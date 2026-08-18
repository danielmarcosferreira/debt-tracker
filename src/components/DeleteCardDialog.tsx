"use client";

import { useState } from "react";
import { Sheet } from "./ui/Sheet";
import { Button } from "./ui/Button";
import { useLanguage } from "@/lib/language-context";
import { deleteCard } from "@/lib/data";
import type { Card } from "@/lib/types";
import { CreditCard } from "lucide-react";

interface DeleteCardDialogProps {
  /** The card to delete, or null when the dialog should be closed. */
  card: Card | null;
  onClose: () => void;
  /** Called right after the card is deleted — e.g. to navigate away from a detail page. */
  onDeleted?: () => void;
}

export function DeleteCardDialog({ card, onClose, onDeleted }: DeleteCardDialogProps) {
  const { t } = useLanguage();
  const [deleting, setDeleting] = useState(false);

  const onConfirm = async () => {
    if (!card) return;
    setDeleting(true);
    try {
      await deleteCard(card.id);
      onClose();
      onDeleted?.();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet
      open={!!card}
      onClose={onClose}
      title={t("cards.deleteTitle")}
      preventClose={deleting}
    >
      {card && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3 dark:bg-slate-800">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: card.color }}
            >
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {card.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {[card.bank, card.last4 && `•••• ${card.last4}`]
                  .filter(Boolean)
                  .join(" · ") || t("cards.creditCardFallback")}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">{t("cards.deleteBody")}</p>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={deleting}
              onClick={onClose}
            >
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
      )}
    </Sheet>
  );
}
