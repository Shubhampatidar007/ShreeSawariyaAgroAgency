import { useSyncExternalStore } from "react";
import type { PublishedProduct } from "@/types/business";

export type CartItem = {
  id: string;
  title: string;
  price: number;
  unit: string;
  emoji: string;
  qty: number;
  productId?: string;
  productVariantId?: string;
};

const STORAGE_KEY = "agrikisan-cart";
const LEGACY_STORAGE_KEY = "agrikisan-cart-legacy";

let items: CartItem[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

const isResolved = (item: CartItem) => Boolean(item.productId && item.productVariantId);

const toStoredItem = (item: CartItem) => ({
  productId: item.productId,
  productVariantId: item.productVariantId,
  qty: item.qty,
});

const persist = () => {
  if (typeof window === "undefined") return;

  const resolved = items.filter(isResolved).map(toStoredItem);
  const legacy = items.filter((item) => !isResolved(item));

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));

  if (legacy.length) {
    window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy));
  } else {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
};

const emit = () => {
  persist();
  listeners.forEach((l) => l());
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => items;
const emptySnapshot: CartItem[] = [];
const getServerSnapshot = () => emptySnapshot;

function parseStoredItems(raw: string | null): CartItem[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function initCart() {
  if (typeof window === "undefined" || hydrated) return;
  hydrated = true;

  try {
    const current = parseStoredItems(window.localStorage.getItem(STORAGE_KEY));
    const legacy = parseStoredItems(window.localStorage.getItem(LEGACY_STORAGE_KEY));
    items = [...current, ...legacy];
    persist();
  } catch {
    items = [];
  }

  listeners.forEach((l) => l());
}

type ProductVariant = NonNullable<PublishedProduct["variants"]>[number];

function effectivePrice(variant: ProductVariant) {
  return variant.discountPrice ?? variant.sellingPrice;
}

function resolveItem(item: CartItem, products: PublishedProduct[]): CartItem | null {
  const product =
    (item.productId && products.find((candidate) => candidate.id === item.productId)) ??
    products.find((candidate) => candidate.id === item.id) ??
    (item.title
      ? products.find(
          (candidate) =>
            candidate.title.trim().toLowerCase() === item.title.trim().toLowerCase(),
        )
      : undefined);

  if (!product) return null;

  const variants = product.variants ?? [];
  const variant =
    (item.productVariantId && variants.find((candidate) => candidate.id === item.productVariantId)) ??
    (variants.length === 1 ? variants[0] : undefined) ??
    variants.find((candidate) => {
      const sameUnit = !item.unit || candidate.label === item.unit;
      const samePrice = !Number.isFinite(item.price) || effectivePrice(candidate) === item.price;
      return sameUnit && samePrice;
    });

  if (!variant) {
    return {
      ...item,
      productId: product.id,
      title: product.title,
      emoji: product.emoji,
    };
  }

  return {
    id: `${product.id}:${variant.id}`,
    title: product.title,
    price: effectivePrice(variant),
    unit: variant.label,
    emoji: product.emoji,
    qty: item.qty,
    productId: product.id,
    productVariantId: variant.id,
  };
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
  hydrateFromProducts(products: PublishedProduct[]) {
    if (!products.length || !items.length) return;

    const resolvedItems = items.map((item) => resolveItem(item, products));
    const merged = new Map<string, CartItem>();

    for (const resolved of resolvedItems) {
      if (!resolved) continue;

      const existing = merged.get(resolved.id);
      if (existing) {
        existing.qty += resolved.qty;
      } else {
        merged.set(resolved.id, resolved);
      }
    }

    items = Array.from(merged.values());
    emit();
  },
};

export function useCart() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const cartCount = (list: CartItem[]) => list.reduce((sum, i) => sum + i.qty, 0);
export const cartSubtotal = (list: CartItem[]) => list.reduce((sum, i) => sum + i.qty * i.price, 0);
