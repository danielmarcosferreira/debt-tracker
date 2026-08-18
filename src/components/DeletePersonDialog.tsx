"use client";

import { useState } from "react";
import { Sheet } from "./ui/Sheet";
import { Button } from "./ui/Button";
import { useLanguage } from "@/lib/language-context";
import { deletePerson } from "@/lib/data";
import { initials } from "@/lib/utils";
import type { Person } from "@/lib/types";

interface DeletePersonDialogProps {
  /** The person to delete, or null when the dialog should be closed. */
  person: Person | null;
  onClose: () => void;
  /** Called right after the person is deleted — e.g. to navigate away from a detail page. */
  onDeleted?: () => void;
}

export function DeletePersonDialog({ person, onClose, onDeleted }: DeletePersonDialogProps) {
  const { t } = useLanguage();
  const [deleting, setDeleting] = useState(false);

  const onConfirm = async () => {
    if (!person) return;
    setDeleting(true);
    try {
      await deletePerson(person.id);
      onClose();
      onDeleted?.();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet
      open={!!person}
      onClose={onClose}
      title={t("peopleDetail.deleteTitle")}
      preventClose={deleting}
    >
      {person && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3 dark:bg-slate-800">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: person.color }}
            >
              {initials(person.name)}
            </div>
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {person.name}
            </p>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("peopleDetail.deleteBody")}
          </p>

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
