import { useSyncExternalStore } from "react";

export type ShopUser = {
  name: string;
  mobile: string;
  email?: string;
  village?: string;
};

const STORAGE_KEY = "agrikisan-user";

let user: ShopUser | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => user;
const getServerSnapshot = () => null;

export function initAuth() {
  if (typeof window === "undefined" || hydrated) return;
  hydrated = true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      user = JSON.parse(raw) as ShopUser;
      emit();
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
}

/** Mock demo accounts — replaced by real auth in the backend phase. */
export const demoAccounts: (ShopUser & { password: string })[] = [
  { name: "Ramesh Yadav", mobile: "9876543210", password: "kisan123", village: "Barwala" },
  { name: "Sunita Devi", mobile: "9812345678", password: "kisan123", village: "Adampur" },
];

export const authStore = {
  login(mobile: string, password: string) {
    const match = demoAccounts.find((a) => a.mobile === mobile && a.password === password);
    if (!match) return { ok: false as const, error: "Mobile number or password is incorrect." };
    const { password: _pw, ...profile } = match;
    user = profile;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    emit();
    return { ok: true as const, user: profile };
  },
  register(profile: ShopUser) {
    user = profile;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    emit();
    return { ok: true as const, user: profile };
  },
  logout() {
    user = null;
    window.localStorage.removeItem(STORAGE_KEY);
    emit();
  },
};

export function useAuth() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}