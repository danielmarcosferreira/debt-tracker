"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { usePeople, reconcileLinkedExpenses } from "@/lib/data";
import { BottomNav } from "@/components/BottomNav";
import { AppLogo } from "@/components/AppLogo";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { people } = usePeople(user?.uid);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Backfill linkedUserId onto a person's pre-link expenses as soon as the
  // owner is active anywhere in the app — not just when they happen to open
  // that specific person's detail page. Without this, a person's expenses
  // logged before they linked their account never show up on their own
  // "I Owe" page. reconcileLinkedExpenses is a cheap no-op once everything
  // is already in sync.
  useEffect(() => {
    if (!user) return;
    for (const person of people) {
      if (person.linkedUserId) {
        reconcileLinkedExpenses(user.uid, person.id, person.linkedUserId);
      }
    }
  }, [user, people]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950">
        <AppLogo />
        <p className="text-sm text-slate-400 dark:text-slate-500">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto min-h-screen max-w-lg bg-slate-50 pb-24 dark:bg-slate-950">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
