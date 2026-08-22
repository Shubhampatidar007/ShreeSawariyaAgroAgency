import { useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  title: string;
  price: number;
  unit: string;
  emoji: string;
  qty: number;
};

const STORAGE_KEY = "agrikisan-cart";

let items: CartItem[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
  listeners.forEach((l) => l());
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => items;
const emptySnapshot: CartItem[] = [];
const getServerSnapshot = () => emptySnapshot;

export function initCart() {
  if (typeof window === "undefined" || hydrated) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) items = JSON.parse(raw) as CartItem[];
  } catch {
    items = [];
  }
  listeners.forEach((l) => l());
}

export const cartStore = {
  add(item: Omit<CartItem, "qty">, qty = 1) {
    const existing = items.find((i) => i.id === item.id);
    items = existing
      ? items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i))
      : [...items, { ...item, qty }];
    emit();
  },
  setQty(id: string, qty: number) {
    items =
      qty <= 0
        ? items.filter((i) => i.id !== id)
        : items.map((i) => (i.id === id ? { ...i, qty } : i));
    emit();
  },
  remove(id: string) {
    items = items.filter((i) => i.id !== id);
    emit();
  },
  clear() {
    items = [];
    emit();
  },
};

export function useCart() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const cartCount = (list: CartItem[]) => list.reduce((sum, i) => sum + i.qty, 0);
export const cartSubtotal = (list: CartItem[]) => list.reduce((sum, i) => sum + i.qty * i.price, 0);
