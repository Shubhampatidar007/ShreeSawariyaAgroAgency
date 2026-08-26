import { useSyncExternalStore } from "react";
import type { PublishedProduct, ProductVariant } from "@/types/business";
import type { CmsSection } from "@/types/operations";
import { supabase } from "@/integrations/supabase/client";

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

export function usePublicShopStore<T>(
  selector: (state: PublicShopState) => T,
): T {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  return selector(snapshot);
}

const toVariant = (row: any): ProductVariant => ({
  id: row.id,
  productId: row.product_id ?? undefined,
  inventoryId: row.inventory_id ?? undefined,
  label: row.label,
  sellingPrice: Number(row.selling_price ?? 0),
  discountPrice:
    row.discount_price == null
      ? undefined
      : Number(row.discount_price),
  stock: Number(row.stock ?? 0),
  status: row.status ?? "active",
});

const toProduct = (
  row: any,
  variants: ProductVariant[],
): PublishedProduct => ({
  id: row.id,
  inventoryId: row.inventory_id ?? "",
  title: row.title,
  category: row.category,
  sellingPrice: Number(row.selling_price ?? 0),
  discountPrice:
    row.discount_price == null
      ? undefined
      : Number(row.discount_price),
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

let loadPromise: Promise<void> | null = null;

export async function loadPublicShopData() {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    setState({
      loading: true,
      error: null,
    });

    try {
      const [
        productsResult,
        variantsResult,
        cmsResult,
      ] = await Promise.all([
        supabase
          .from("products")
          .select(
            "id, inventory_id, title, category, selling_price, discount_price, stock, description, tags, images, emoji, visibility, featured, status, published_on",
          )
          .eq("visibility", "public")
          .eq("status", "published")
          .order("published_on", {
            ascending: false,
          }),

        // The generated database types predate product_variants. Keep the
        // existing shared client unchanged and scope the type escape to this
        // one query until the generated schema is refreshed.
        supabase
          .from("product_variants" as any)
          .select(
            "id, product_id, inventory_id, label, selling_price, discount_price, stock, status",
          )
          .eq("status", "active"),

        supabase
          .from("cms_sections")
          .select(
            "id, name, type, enabled, visibility, sort_order, headline, body, scheduled_from, scheduled_to, image_label",
          )
          .eq("enabled", true)
          .eq("visibility", "public")
          .order("sort_order"),
      ]);

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (variantsResult.error) {
        throw variantsResult.error;
      }

      if (cmsResult.error) {
        throw cmsResult.error;
      }

      const variantsByProduct = new Map<string, ProductVariant[]>();

      for (const row of variantsResult.data ?? []) {
        const variant = toVariant(row);

        if (!variant.productId) {
          continue;
        }

        const list = variantsByProduct.get(variant.productId) ?? [];

        list.push(variant);

        variantsByProduct.set(variant.productId, list);
      }

      setState({
        products: (productsResult.data ?? []).map((row) =>
          toProduct(row, variantsByProduct.get(row.id) ?? []),
        ),

        cmsSections: (cmsResult.data ?? []).map(toCmsSection),

        loading: false,
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load public shop data";

      setState({
        loading: false,
        error: message,
      });

      throw error;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export function initPublicShopData() {
  if (typeof window === "undefined") {
    return null;
  }

  if (
    !loadPromise &&
    state.products.length === 0 &&
    state.cmsSections.length === 0
  ) {
    void loadPublicShopData().catch((error) => {
      console.error(
        "Public shop data load failed:",
        error,
      );
    });
  }

  return loadPromise;
}
