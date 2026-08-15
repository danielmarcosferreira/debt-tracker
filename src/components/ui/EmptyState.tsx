import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center dark:border-slate-700">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950">
        <Icon className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
      </div>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {title}
      </p>
      <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
