import { supabase } from "@/integrations/supabase/client";
import type { ProductVariant, PublishedProduct } from "@/types/business";
import { shopStore } from "@/lib/shop-store";

let productLoadPromise: Promise<void> | null = null;

const num = (value: unknown) => Number(value ?? 0);

const toVariant = (row: any): ProductVariant => ({
  id: row.id,
  productId: row.product_id ?? undefined,
  inventoryId: row.inventory_id ?? undefined,
  label: row.label ?? "unit",
  sellingPrice: num(row.selling_price),
  discountPrice:
    row.discount_price == null ? undefined : num(row.discount_price),
  stock: num(row.stock),
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
  sellingPrice: num(row.selling_price),
  discountPrice:
    row.discount_price == null ? undefined : num(row.discount_price),
  stock: num(row.stock),
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

export async function ensureAdminProductCatalog() {
  const current = shopStore.get();
  if (current.products.length > 0) return;
  if (productLoadPromise) return productLoadPromise;

  productLoadPromise = (async () => {
    const [products, variants] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .order("published_on", { ascending: false }),
      supabase
        .from("product_variants" as any)
        .select("*")
        .eq("status", "active"),
    ]);

    const result = [products, variants].find((query) => query.error);
    if (result?.error) throw result.error;

    const variantsByProduct = new Map<string, ProductVariant[]>();
    for (const row of variants.data ?? []) {
      const variant = toVariant(row);
      if (!variant.productId) continue;
      const list = variantsByProduct.get(variant.productId) ?? [];
      list.push(variant);
      variantsByProduct.set(variant.productId, list);
    }

    const snapshot = shopStore.get() as any;
    snapshot.products = (products.data ?? []).map((row) =>
      toProduct(row, variantsByProduct.get(row.id) ?? []),
    );
    shopStore.setDraftProduct(snapshot.draftProduct ?? null);
  })().finally(() => {
    productLoadPromise = null;
  });

  return productLoadPromise;
}
