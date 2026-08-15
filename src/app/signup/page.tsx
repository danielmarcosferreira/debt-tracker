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

export default function SignupPage() {
  const { signUp } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t("signup.passwordTooShort"));
      return;
    }
    setLoading(true);
    try {
      await signUp(name, email, password);
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
            {t("signup.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("signup.subtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={t("signup.name")} htmlFor="name">
          <Input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("signup.namePlaceholder")}
          />
        </Field>
        <Field label={t("signup.email")} htmlFor="email">
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
        <Field label={t("signup.password")} htmlFor="password">
          <Input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("signup.passwordPlaceholder")}
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          {t("signup.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {t("signup.haveAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          {t("signup.signIn")}
        </Link>
      </p>
    </div>
  );
}
