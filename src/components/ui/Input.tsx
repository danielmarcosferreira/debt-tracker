"use client";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

export function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    // min-w-0: as a grid/flex item this otherwise defaults to min-width:auto,
    // which stops it (and native controls inside it, e.g. type="date") from
    // ever shrinking below their content's intrinsic width — on a 2-column
    // row that's what was forcing the whole sheet wider than the screen.
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        title={label}
        className="truncate text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// text-base (16px), not smaller: iOS Safari auto-zooms the whole page on
// focus for any input under 16px, which is the "width" glitch on mobile.
const fieldClasses =
  "block w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-950";

const DATE_LIKE_TYPES = new Set(["date", "time", "datetime-local", "month", "week"]);

export function Input({ className, type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        fieldClasses,
        // iOS Safari's date/time inputs ignore `width: 100%` outright and lay
        // out at their own intrinsic size in any container. Starting from a
        // near-zero basis and letting min-width pull it back up to the
        // container is the documented workaround — `!important` because it
        // has to win over fieldClasses' own `w-full`.
        type && DATE_LIKE_TYPES.has(type) && "!w-px !min-w-full",
        className
      )}
      {...props}
    />
  );
}

export function PasswordInput({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={cn(fieldClasses, "pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? t("common.hidePassword") : t("common.showPassword")}
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClasses, className)} {...props}>
      {children}
    </select>
  );
}

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className="text-sm font-medium text-slate-700 dark:text-slate-300"
      {...props}
    />
  );
}
