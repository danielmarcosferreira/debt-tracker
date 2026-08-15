"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CURRENCIES } from "@/lib/types";
import type { CurrencyCode } from "@/lib/types";
import { friendlyAuthError, initials } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, profile, updateUserProfile, resetPassword, logOut } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const [name, setName] = useState(profile?.name ?? user?.displayName ?? "");
  const [currency, setCurrency] = useState<CurrencyCode>(
    profile?.defaultCurrency ?? "USD"
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const displayName = profile?.name || user.displayName || user.email || "?";

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateUserProfile({ name: name.trim(), defaultCurrency: currency });
      setSaved(true);
    } catch (err) {
      setError(friendlyAuthError(err, language));
    } finally {
      setSaving(false);
    }
  };

  const onSendReset = async () => {
    if (!user.email) return;
    setResetting(true);
    try {
      await resetPassword(user.email);
      setResetSent(true);
    } finally {
      setResetting(false);
    }
  };

  const onSignOut = async () => {
    setSigningOut(true);
    await logOut();
    router.replace("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto max-w-lg">
          <Link
            href="/dashboard"
            className="mb-3 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
          >
            <ArrowLeft className="h-4 w-4" /> {t("profile.back")}
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white">
              {initials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-100">
                {displayName}
              </h1>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-5 pt-5 pb-10">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t("profile.yourInfo")}
          </h2>
          <form
            onSubmit={onSave}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <Field label={t("profile.name")} htmlFor="name">
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
              />
            </Field>
            <Field label={t("profile.defaultCurrency")} htmlFor="currency">
              <Select
                id="currency"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value as CurrencyCode);
                  setSaved(false);
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </Select>
            </Field>
            <p className="-mt-1 text-xs text-slate-400 dark:text-slate-500">
              {t("profile.currencyHint")}
            </p>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </p>
            )}
            {saved && (
              <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {t("profile.saved")}
              </p>
            )}

            <Button type="submit" loading={saving} className="w-full">
              {t("profile.save")}
            </Button>
          </form>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t("profile.preferences")}
          </h2>
          <div className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t("profile.theme")}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("profile.themeHint")}
                </p>
              </div>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t("profile.language")}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("profile.languageHint")}
                </p>
              </div>
              <LanguageSwitcher />
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t("profile.security")}
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            {resetSent ? (
              <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />{" "}
                {t("profile.resetSent", { email: user.email ?? "" })}
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                  {t("profile.securityHint")}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  loading={resetting}
                  onClick={onSendReset}
                  className="w-full"
                >
                  {t("profile.sendReset")}
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="mt-6">
          <Button
            type="button"
            variant="danger"
            loading={signingOut}
            onClick={onSignOut}
            className="w-full"
          >
            <LogOut className="h-4 w-4" /> {t("profile.signOut")}
          </Button>
        </section>
      </main>
    </>
  );
}
