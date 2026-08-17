"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { newId } from "./utils";
import type { Card, Person, Expense, CurrencyCode, Category } from "./types";

const cardsCol = collection(db, "cards");
const peopleCol = collection(db, "people");
const expensesCol = collection(db, "expenses");

// ---------- Cards ----------

export function useCards(uid: string | undefined) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(cardsCol, where("ownerId", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Card);
      list.sort((a, b) => a.createdAt - b.createdAt);
      setCards(list);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return { cards: uid ? cards : [], loading: uid ? loading : false };
}

export async function addCard(
  ownerId: string,
  data: Omit<Card, "id" | "ownerId" | "createdAt">
) {
  await addDoc(cardsCol, { ...data, ownerId, createdAt: Date.now() });
}

export async function updateCard(id: string, data: Partial<Card>) {
  await updateDoc(doc(db, "cards", id), data);
}

export async function deleteCard(id: string) {
  await deleteDoc(doc(db, "cards", id));
}

// ---------- People ----------

export function usePeople(uid: string | undefined) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(peopleCol, where("ownerId", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Person);
      list.sort((a, b) => a.name.localeCompare(b.name));
      setPeople(list);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return { people: uid ? people : [], loading: uid ? loading : false };
}

export async function addPerson(
  ownerId: string,
  data: { name: string; color: string; inviteEmail?: string | null }
) {
  await addDoc(peopleCol, {
    ownerId,
    name: data.name,
    color: data.color,
    inviteEmail: data.inviteEmail?.trim().toLowerCase() || null,
    linkedUserId: null,
    createdAt: Date.now(),
  });
}

export async function updatePerson(id: string, data: Partial<Person>) {
  await updateDoc(doc(db, "people", id), data);
}

export async function deletePerson(id: string) {
  await deleteDoc(doc(db, "people", id));
}

/**
 * A person can link their own account after being invited. When that happens
 * their past expenses (created before linking) won't have linkedUserId set
 * yet, since only the owner's client writes expenses. Call this once the
 * owner's session sees a person with linkedUserId set, to backfill.
 */
export async function reconcileLinkedExpenses(
  ownerId: string,
  personId: string,
  linkedUserId: string
) {
  const q = query(
    expensesCol,
    where("ownerId", "==", ownerId),
    where("personId", "==", personId)
  );
  const snap = await getDocs(q);
  const stale = snap.docs.filter((d) => d.data().linkedUserId !== linkedUserId);
  if (stale.length === 0) return;
  const batch = writeBatch(db);
  stale.forEach((d) => batch.update(d.ref, { linkedUserId }));
  await batch.commit();
}

// ---------- Expenses ----------

export function useExpenses(uid: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(expensesCol, where("ownerId", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense);
      list.sort((a, b) => b.date.localeCompare(a.date));
      setExpenses(list);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return { expenses: uid ? expenses : [], loading: uid ? loading : false };
}

/** Cross-owner: expenses assigned to a person linked to this account, across any owner's ledger. */
export function useMyDebts(uid: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(expensesCol, where("linkedUserId", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense);
      list.sort((a, b) => b.date.localeCompare(a.date));
      setExpenses(list);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return { expenses: uid ? expenses : [], loading: uid ? loading : false };
}

export interface NewExpenseInput {
  ownerId: string;
  cardId: string;
  cardName: string;
  ownerName: string;
  personId: string | null;
  forSelf: boolean;
  linkedUserId?: string | null;
  description: string;
  amount: number;
  currency: CurrencyCode;
  category: Category;
  date: string;
  /** When > 1, splits the amount into this many monthly installments instead of one expense. */
  installmentCount?: number;
  /**
   * Which installment number `date`/`amount` represent (1-based, default 1). Use > 1 to log a
   * purchase that was already partway through its installment plan before you started tracking
   * it here — only installments from this number onward are created. When > 1, `amount` is the
   * amount of a single installment rather than the purchase total.
   */
  installmentStart?: number;
}

export async function addExpense(input: NewExpenseInput) {
  const count = Math.max(1, Math.floor(input.installmentCount ?? 1));
  const start = Math.min(count, Math.max(1, Math.floor(input.installmentStart ?? 1)));
  const base = {
    ownerId: input.ownerId,
    cardId: input.cardId,
    cardName: input.cardName,
    ownerName: input.ownerName,
    personId: input.personId,
    forSelf: input.forSelf,
    linkedUserId: input.linkedUserId ?? null,
    description: input.description,
    currency: input.currency,
    category: input.category,
    paid: false,
    createdAt: Date.now(),
  };

  if (count <= 1) {
    await addDoc(expensesCol, {
      ...base,
      amount: input.amount,
      date: input.date,
      installment: null,
    });
    return;
  }

  const groupId = newId();
  // Starting past installment 1 means the purchase was already in progress before being logged
  // here: `amount` is then a single installment's value already, not the purchase total.
  const perInstallment =
    start <= 1 ? Math.round((input.amount / count) * 100) / 100 : Math.round(input.amount * 100) / 100;
  const batch = writeBatch(db);
  const startDate = new Date(input.date + "T00:00:00");

  for (let i = start; i <= count; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + (i - start));
    const iso = d.toISOString().slice(0, 10);
    const ref = doc(expensesCol);
    batch.set(ref, {
      ...base,
      amount: perInstallment,
      date: iso,
      installment: { groupId, index: i, count },
    });
  }
  await batch.commit();
}

export async function markExpensePaid(id: string, paid: boolean) {
  await updateDoc(doc(db, "expenses", id), { paid });
}

export async function deleteExpense(id: string) {
  await deleteDoc(doc(db, "expenses", id));
}

/** Deletes several expenses atomically — used to remove "this and future" installments together. */
export async function deleteExpenses(ids: string[]) {
  if (ids.length === 0) return;
  if (ids.length === 1) {
    await deleteExpense(ids[0]);
    return;
  }
  const batch = writeBatch(db);
  ids.forEach((id) => batch.delete(doc(db, "expenses", id)));
  await batch.commit();
}

export async function updateExpense(id: string, data: Partial<Omit<Expense, "id">>) {
  await updateDoc(doc(db, "expenses", id), data);
}

/** Fields that make sense to apply uniformly across a whole installment group. `date` is deliberately excluded — each installment keeps its own date. */
export interface ExpenseSharedEdit {
  description: string;
  amount: number;
  cardId: string;
  cardName: string;
  currency: CurrencyCode;
  personId: string | null;
  forSelf: boolean;
  linkedUserId?: string | null;
  category: Category;
}

/**
 * Edits one expense. When `futureIds` is non-empty, the shared fields (not
 * `date` — each installment keeps its own) are also applied to every id in
 * `futureIds` atomically, so "this and future installments" lands as one
 * commit instead of racing individual writes.
 */
export async function updateExpenseWithScope(
  expenseId: string,
  date: string,
  shared: ExpenseSharedEdit,
  futureIds: string[] = []
) {
  const sharedData = { ...shared, linkedUserId: shared.linkedUserId ?? null };
  if (futureIds.length === 0) {
    await updateExpense(expenseId, { ...sharedData, date });
    return;
  }
  const batch = writeBatch(db);
  batch.update(doc(db, "expenses", expenseId), { ...sharedData, date });
  futureIds.forEach((id) => batch.update(doc(db, "expenses", id), sharedData));
  await batch.commit();
}
