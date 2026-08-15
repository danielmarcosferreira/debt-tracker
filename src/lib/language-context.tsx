"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { translate, translatePlural, type TranslationKey } from "./i18n";
import type { LanguageCode } from "./types";

const STORAGE_KEY = "debt-tracker-language";

function isLanguageCode(v: string | null): v is LanguageCode {
  return v === "en" || v === "pt";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredLanguage(): LanguageCode | null {
  const v = localStorage.getItem(STORAGE_KEY);
  return isLanguageCode(v) ? v : null;
}

/** Reads the locally-persisted language choice, hydration-safe (null on the server/first render). */
function useStoredLanguage() {
  return useSyncExternalStore(subscribe, getStoredLanguage, () => null);
}

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  tc: (
    base: string,
    count: number,
    vars?: Record<string, string | number>
  ) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { profile, updateUserProfile } = useAuth();
  const stored = useStoredLanguage();
  const language: LanguageCode = stored ?? profile?.language ?? "en";

  function setLanguage(lang: LanguageCode) {
    localStorage.setItem(STORAGE_KEY, lang);
    // A native `storage` event only fires in *other* tabs; dispatch one here
    // too so this tab's useSyncExternalStore subscribers re-read it immediately.
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    if (profile) {
      void updateUserProfile({ language: lang });
    }
  }

  // Keep the document's lang attribute in sync for accessibility/SEO. This is
  // a DOM mutation, not React state, so it's fine to do unconditionally here.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t: (key, vars) => translate(language, key, vars),
    tc: (base, count, vars) => translatePlural(language, base, count, vars),
  };

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
