"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { addMonthsToKey, currentMonthKey } from "./utils";

function noopSubscribe() {
  return () => {};
}

/** The current "yyyy-MM" key, hydration-safe (null until the client resolves "today"). */
export function useTodayMonthKey() {
  return useSyncExternalStore(noopSubscribe, currentMonthKey, () => null);
}

export type Scope = "month" | "all";

export interface MonthScope {
  scope: Scope;
  setScope: (scope: Scope) => void;
  /** "yyyy-MM" for the selected month, or null when scope is "all" (or "today" hasn't resolved yet). */
  monthKey: string | null;
  isCurrentMonth: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export interface MonthScopeInitial {
  scope?: Scope;
  /** Month to open on ("yyyy-MM"). Omit/null to follow "today". */
  monthKey?: string | null;
}

function readStoredMonthScope(storageKey: string): MonthScopeInitial | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as MonthScopeInitial) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Drives a month-vs-all-time picker: defaults to the current month, with
 * prev/next navigation.
 *
 * - Pass `initial` to deep-link into a specific month (or "all") — e.g. when
 *   arriving from a link that carried a month over from another page —
 *   without needing "today" to resolve first. Takes priority over
 *   `storageKey` when both are given.
 * - Pass `storageKey` to remember the picker's state in localStorage across
 *   visits/reloads (e.g. so switching months on the dashboard, navigating
 *   away, and coming back doesn't silently reset to the current month).
 */
export function useMonthScope(initial?: MonthScopeInitial, storageKey?: string): MonthScope {
  const todayKey = useTodayMonthKey();
  const resolvedInitial = initial ?? (storageKey ? readStoredMonthScope(storageKey) : undefined);

  const [scope, setScope] = useState<Scope>(resolvedInitial?.scope ?? "month");
  const [explicitMonthKey, setExplicitMonthKey] = useState<string | null>(
    resolvedInitial?.monthKey ?? null
  );

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ scope, monthKey: explicitMonthKey }));
    } catch {
      // Storage can fail (private browsing, quota) — persistence is a nice-to-have, not required.
    }
  }, [storageKey, scope, explicitMonthKey]);

  const effectiveMonthKey = explicitMonthKey ?? todayKey;
  const monthKey = scope === "month" ? effectiveMonthKey : null;

  const shiftMonth = (delta: number) => {
    const base = explicitMonthKey ?? todayKey;
    if (base) setExplicitMonthKey(addMonthsToKey(base, delta));
  };

  return {
    scope,
    setScope,
    monthKey,
    isCurrentMonth: explicitMonthKey === null || explicitMonthKey === todayKey,
    onPrevMonth: () => shiftMonth(-1),
    onNextMonth: () => shiftMonth(1),
    onToday: () => setExplicitMonthKey(null),
  };
}
