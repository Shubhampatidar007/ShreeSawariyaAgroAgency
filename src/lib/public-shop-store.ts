import { useSyncExternalStore } from "react";
import type { PublishedProduct, ProductVariant } from "@/types/business";
import type { Advertisement } from "@/types";
import type { CmsSection } from "@/types/operations";
import { supabase } from "@/integrations/supabase/client";

type PublicShopState = {
  products: PublishedProduct[];
  cmsSections: CmsSection[];
  advertisements: Advertisement[];
  loading: boolean;
  error: string | null;
};

let state: PublicShopState = {
  products: [],
  cmsSections: [],
  advertisements: [],
  loading: true,
  error: null,
};

const listeners = new Set<() => void>();
const PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000;
let loadedAt = 0;

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

export function usePublicShopStore<T>(selector: (state: PublicShopState) => T): T {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector(snapshot);
}

type VariantRow = {
  id: string;
  product_id: string | null;
  inventory_id: string | null;
  label: string;
  selling_price: number | string | null;
  discount_price: number | string | null;
  stock: number | string | null;
  status: string | null;
};

type ProductRow = {
  id: string;
  inventory_id: string | null;
  title: string;
  brand: string | null;
  category: string;
  selling_price: number | string | null;
  discount_price: number | string | null;
  stock: number | string | null;
  description: string | null;
  tags: string[] | null;
  images: string[] | null;
  emoji: string | null;
  visibility: string;
  featured: boolean | null;
  status: string;
  published_on: string;
};

type CmsRow = {
  id: string;
  name: string;
  type: string;
  enabled: boolean | null;
  visibility: string;
  sort_order: number | null;
  headline: string | null;
  body: string | null;
  scheduled_from: string | null;
  scheduled_to: string | null;
  image_label: string | null;
};

type AdvertisementRow = {
  id: string;
  title: string;
  placement: string;
  audience: string;
  status: Advertisement["status"];
  impressions: number | null;
  clicks: number | null;
  starts_on: string;
  runs_until: string;
};

const toVariant = (row: VariantRow): ProductVariant => ({
  id: row.id,
  productId: row.product_id ?? undefined,
  inventoryId: row.inventory_id ?? undefined,
  label: row.label,
  sellingPrice: Number(row.selling_price ?? 0),
  discountPrice: row.discount_price == null ? undefined : Number(row.discount_price),
  stock: Number(row.stock ?? 0),
  status: row.status ?? "active",
});

const toProduct = (row: ProductRow, variants: ProductVariant[]): PublishedProduct => ({
  id: row.id,
  inventoryId: row.inventory_id ?? "",
  title: row.title,
  brand: row.brand?.trim() || undefined,
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
  variants,
});

const toCmsSection = (row: CmsRow): CmsSection => ({
  id: row.id,
  name: row.name,
  type: row.type,
  enabled: !!row.enabled,
  visibility: row.visibility,
  order: row.sort_order ?? 0,
  headline: row.headline ?? "",
  body: row.body ?? "",
  scheduledFrom: row.scheduled_from ?? undefined,
  scheduledTo: row.scheduled_to ?? undefined,
  imageLabel: row.image_label ?? "",
});

const toAdvertisement = (row: AdvertisementRow): Advertisement => ({
  id: row.id,
  title: row.title,
  placement: row.placement,
  audience: row.audience,
  status: row.status,
  impressions: row.impressions ?? 0,
  clicks: row.clicks ?? 0,
  startsOn: row.starts_on,
  runsUntil: row.runs_until,
});

let loadPromise: Promise<void> | null = null;

export async function loadPublicShopData() {
  if (loadPromise) return loadPromise;
  if (loadedAt && Date.now() - loadedAt < PUBLIC_CACHE_TTL_MS) return;

  loadPromise = (async () => {
    setState({ loading: true, error: null });

    try {
      const today = new Date().toISOString().slice(0, 10);
      const [productsResult, cmsResult, advertisementsResult] = await Promise.all([
        supabase
          .from("products")
          .select(
            "id, inventory_id, title, brand, category, selling_price, discount_price, stock, description, tags, images, emoji, visibility, featured, status, published_on",
          )
          .eq("visibility", "public")
          .eq("status", "published")
          .order("published_on", { ascending: false }),
        supabase
          .from("cms_sections")
          .select(
            "id, name, type, enabled, visibility, sort_order, headline, body, scheduled_from, scheduled_to, image_label",
          )
          .eq("enabled", true)
          .eq("visibility", "public")
          .order("sort_order"),
        supabase
          .from("advertisements")
          .select("id, title, placement, audience, status, impressions, clicks, starts_on, runs_until")
          .eq("placement", "Deals")
          .eq("status", "live")
          .lte("starts_on", today)
          .gte("runs_until", today)
          .order("created_at", { ascending: false }),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (cmsResult.error) throw cmsResult.error;
      if (advertisementsResult.error) throw advertisementsResult.error;

      const publishedProductIds = (productsResult.data ?? []).map((product) => product.id);
      const variantsResult = publishedProductIds.length
        ? await supabase
            .from("product_variants" as any)
            .select("id, product_id, inventory_id, label, selling_price, discount_price, stock, status")
            .eq("status", "active")
            .in("product_id", publishedProductIds)
        : { data: [], error: null };

      if (variantsResult.error) throw variantsResult.error;

      const variantsByProduct = new Map<string, ProductVariant[]>();
      for (const row of (variantsResult.data ?? []) as VariantRow[]) {
        const variant = toVariant(row);
        if (!variant.productId) continue;
        const list = variantsByProduct.get(variant.productId) ?? [];
        list.push(variant);
        variantsByProduct.set(variant.productId, list);
      }

      setState({
        products: (productsResult.data ?? []).map((row) =>
          toProduct(row as ProductRow, variantsByProduct.get(row.id) ?? []),
        ),
        cmsSections: (cmsResult.data ?? []).map((row) => toCmsSection(row as CmsRow)),
        advertisements: (advertisementsResult.data ?? []).map((row) => toAdvertisement(row as AdvertisementRow)),
        loading: false,
        error: null,
      });
      loadedAt = Date.now();
    } catch (error) {
      loadedAt = 0;
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load public shop data",
      });
      throw error;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export function initPublicShopData() {
  if (typeof window === "undefined") return null;

  void loadPublicShopData().catch((error) => {
    console.error("Public shop data load failed:", error);
  });

  return loadPromise;
}
