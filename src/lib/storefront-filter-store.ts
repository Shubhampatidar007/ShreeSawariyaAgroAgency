import { useSyncExternalStore } from "react";
import type { PublishedProduct } from "@/types/business";

type StorefrontFilterState = {
  searchQuery: string;
  selectedCategory: string | null;
};

let state: StorefrontFilterState = {
  searchQuery: "",
  selectedCategory: null,
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => state;

export function useStorefrontFilters<T>(selector: (state: StorefrontFilterState) => T): T {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector(snapshot);
}

export const storefrontFilterStore = {
  setSearchQuery(searchQuery: string) {
    state = { ...state, searchQuery };
    notify();
  },
  setCategory(selectedCategory: string | null) {
    state = { ...state, selectedCategory };
    notify();
  },
  clear() {
    state = { searchQuery: "", selectedCategory: null };
    notify();
  },
};

export const matchesStorefrontSearch = (product: PublishedProduct, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const searchable = [
    product.title,
    product.category,
    product.description,
    ...(product.tags ?? []),
    ...(product.variants ?? []).flatMap((variant) => [
      variant.label,
      String(variant.sellingPrice),
      String(variant.discountPrice ?? ""),
    ]),
  ]
    .join(" ")
    .toLowerCase();

  return searchable.includes(normalized);
};
