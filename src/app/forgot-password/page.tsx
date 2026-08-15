"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AppLogo } from "@/components/AppLogo";
import { friendlyAuthError } from "@/lib/utils";
import { CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { t, language } = useLanguage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(friendlyAuthError(err, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 sm:mx-auto sm:w-full sm:max-w-sm">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>

      <div className="mb-8 mt-4 flex flex-col items-center gap-3">
        <AppLogo />
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t("forgotPassword.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("forgotPassword.subtitle")}
          </p>
        </div>
      </div>

      {sent ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-50 px-5 py-8 text-center dark:bg-emerald-950">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {t("forgotPassword.sentTitle")}
          </p>
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {t("forgotPassword.sentBody", { email })}
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label={t("forgotPassword.email")} htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {t("forgotPassword.submit")}
          </Button>
        </form>
      )}

      <Link
        href="/login"
        className="mt-6 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("forgotPassword.back")}
      </Link>
    </div>
  );
}
