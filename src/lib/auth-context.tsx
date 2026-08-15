"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { CurrencyCode, LanguageCode, UserProfile } from "./types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (updates: {
    name?: string;
    defaultCurrency?: CurrencyCode;
    language?: LanguageCode;
  }) => Promise<void>;
}

function detectBrowserLanguage(): LanguageCode {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en";
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Links any pending invites (people docs where inviteEmail == this user's email) to this account. */
async function claimPendingInvites(uid: string, email: string) {
  const q = query(
    collection(db, "people"),
    where("inviteEmail", "==", email),
    where("linkedUserId", "==", null)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { linkedUserId: uid }));
  await batch.commit();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        if (u.email) await claimPendingInvites(u.uid, u.email);
        const snap = await getDoc(doc(db, "users", u.uid));
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signUp(name: string, email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      name,
      email,
      defaultCurrency: "USD",
      language: detectBrowserLanguage(),
      createdAt: Date.now(),
    };
    await setDoc(doc(db, "users", cred.user.uid), newProfile);
    await claimPendingInvites(cred.user.uid, email);
    setProfile(newProfile);
  }

  async function logIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logOut() {
    await signOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function updateUserProfile(updates: {
    name?: string;
    defaultCurrency?: CurrencyCode;
    language?: LanguageCode;
  }) {
    if (!user) return;
    if (updates.name && updates.name !== user.displayName) {
      await updateProfile(user, { displayName: updates.name });
    }
    // Upsert with merge: a profile doc may not exist yet for older accounts
    // (e.g. one created before this field set existed).
    const next: UserProfile = {
      uid: user.uid,
      name: updates.name ?? profile?.name ?? user.displayName ?? "",
      email: user.email ?? profile?.email ?? "",
      defaultCurrency: updates.defaultCurrency ?? profile?.defaultCurrency ?? "USD",
      language: updates.language ?? profile?.language ?? detectBrowserLanguage(),
      createdAt: profile?.createdAt ?? Date.now(),
    };
    await setDoc(doc(db, "users", user.uid), next, { merge: true });
    setProfile(next);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        logIn,
        logOut,
        resetPassword,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { serverTimestamp };
