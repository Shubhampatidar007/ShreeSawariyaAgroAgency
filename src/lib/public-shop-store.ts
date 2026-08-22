import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PublishedProduct } from "@/types/business";
import type { CmsSection } from "@/types/operations";

type PublicShopState = {
  products: PublishedProduct[];
  cmsSections: CmsSection[];
  loading: boolean;
  error: string | null;
};

let state: PublicShopState = {
  products: [],
  cmsSections: [],
  loading: true,
  error: null,
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const setState = (update: Partial<PublicShopState>) => {
  state = { ...state, ...update };
  notify();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

export function usePublicShopStore<T>(selector: (value: PublicShopState) => T): T {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector(snapshot);
}

let loadPromise: Promise<void> | null = null;

const toProduct = (row: any): PublishedProduct => ({
  id: row.id,
  inventoryId: row.inventory_id ?? "",
  title: row.title,
  category: row.category,
  sellingPrice: Number(row.selling_price ?? 0),
  discountPrice: row.discount_price == null ? undefined : Number(row.discount_price),
  stock: Number(row.stock ?? 0),
  description: row.description ?? "",
  tags: row.tags ?? [],
  images: row.images ?? [],
  emoji: row.emoji ?? "🌾",
  visibility: row.visibility,
  featured: !!row.featured,
  status: row.status,
  publishedOn: row.published_on,
});

const toCmsSection = (row: any): CmsSection => ({
  id: row.id,
  name: row.name,
  type: row.type,
  enabled: !!row.enabled,
  visibility: row.visibility,
  order: row.sort_order,
  headline: row.headline ?? "",
  body: row.body ?? "",
  scheduledFrom: row.scheduled_from ?? undefined,
  scheduledTo: row.scheduled_to ?? undefined,
  imageLabel: row.image_label ?? "",
});

export async function loadPublicShopData() {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    setState({ loading: true, error: null });

    try {
      const [productsResult, cmsResult] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("visibility", "public")
          .eq("status", "published")
          .order("published_on", { ascending: false }),
        supabase
          .from("cms_sections")
          .select("*")
          .eq("enabled", true)
          .eq("visibility", "public")
          .order("sort_order"),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (cmsResult.error) throw cmsResult.error;

      setState({
        products: (productsResult.data ?? []).map(toProduct),
        cmsSections: (cmsResult.data ?? []).map(toCmsSection),
        loading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load public shop data";
      setState({ loading: false, error: message });
      throw error;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export function initPublicShopData() {
  if (typeof window === "undefined") return null;

  if (!loadPromise && state.products.length === 0 && state.cmsSections.length === 0) {
    void loadPublicShopData().catch((error) => {
      console.error("Public shop data load failed:", error);
    });
  }

  return loadPromise;
}
