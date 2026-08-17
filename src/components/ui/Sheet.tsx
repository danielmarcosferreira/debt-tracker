"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] dark:bg-black/60"
        onClick={onClose}
      />
      {/*
        overflow-x-hidden is a hard guard: some mobile browsers render native
        controls (e.g. input[type=date]) with an intrinsic width CSS can't
        shrink, wide enough to push a plain overflow-y-auto box past 100%
        width and take the whole page with it. Clipping here keeps that
        contained to the sheet instead of blowing out the page.
      */}
      <div className="relative z-10 max-h-[92vh] w-full overflow-x-hidden overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-xl sm:max-w-md sm:rounded-3xl sm:p-6 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
