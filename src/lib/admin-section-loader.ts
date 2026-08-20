import { loadAdminShopData } from "@/lib/shop-store";

let lastLoadedAt = 0;
let pending: Promise<void> | null = null;
const CACHE_MS = 30_000;

/**
 * Keeps legacy admin modules working while preventing every route transition
 * from re-fetching the complete admin dataset.
 */
export function ensureAdminSectionData(force = false) {
  if (typeof window === "undefined") return Promise.resolve();

  if (!force && lastLoadedAt && Date.now() - lastLoadedAt < CACHE_MS) {
    return Promise.resolve();
  }

  if (pending) return pending;

  pending = loadAdminShopData()
    .then(() => {
      lastLoadedAt = Date.now();
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

export function invalidateAdminSectionData() {
  lastLoadedAt = 0;
}
