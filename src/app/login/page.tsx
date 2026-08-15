"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { friendlyAuthError } from "@/lib/utils";
import { HandCoins } from "lucide-react";

export default function LoginPage() {
  const { logIn } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await logIn(email, password);
      router.replace("/dashboard");
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
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
          <HandCoins className="h-6 w-6" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t("login.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("login.subtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={t("login.email")} htmlFor="email">
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
        <Field label={t("login.password")} htmlFor="password">
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            {t("login.forgotPassword")}
          </Link>
        </div>

        <Button type="submit" loading={loading} className="w-full">
          {t("login.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {t("login.noAccount")}{" "}
        <Link
          href="/signup"
          className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          {t("login.signUp")}
        </Link>
      </p>
    </div>
  );
}
