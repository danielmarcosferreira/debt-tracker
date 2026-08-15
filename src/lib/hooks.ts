"use client";

import { useState, useSyncExternalStore } from "react";
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

/** Drives a month-vs-all-time picker: defaults to the current month, with prev/next navigation. */
export function useMonthScope(): MonthScope {
  const todayKey = useTodayMonthKey();
  const [scope, setScope] = useState<Scope>("month");
  const [monthOffset, setMonthOffset] = useState(0);

  const monthKey = scope === "month" && todayKey ? addMonthsToKey(todayKey, monthOffset) : null;

  return {
    scope,
    setScope,
    monthKey,
    isCurrentMonth: monthOffset === 0,
    onPrevMonth: () => setMonthOffset((o) => o - 1),
    onNextMonth: () => setMonthOffset((o) => o + 1),
    onToday: () => setMonthOffset(0),
  };
}
