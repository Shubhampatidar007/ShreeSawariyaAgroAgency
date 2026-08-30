import { supabase } from "@/integrations/supabase/client";

export const KHATA_INVENTORY_PAGE_SIZE = 40;

type InventoryRow = {
  id: string;
  product_name: string;
  supplier_name: string | null;
  quantity: number | string | null;
  unit: string | null;
  purchase_price: number | string | null;
};

type ProductRow = {
  id: string;
  inventory_id: string | null;
  title: string;
  category: string | null;
  selling_price: number | string | null;
  discount_price: number | string | null;
  emoji: string | null;
};

type VariantRow = {
  id: string;
  inventory_id: string | null;
  product_id: string | null;
  label: string | null;
  selling_price: number | string | null;
  discount_price: number | string | null;
  stock: number | string | null;
  status: string | null;
};

export type KhataInventoryOption = {
  key: string;
  inventoryId: string;
  productId?: string;
  productVariantId?: string;
  title: string;
  subtitle: string;
  emoji: string;
  unit: string;
  rate: number;
  stock: number;
};

const num = (value: unknown) => Number(value ?? 0);

const sanitizeSearch = (value: string) => value.replace(/[%,_]/g, " ").replace(/,/g, " ").trim();

export async function loadKhataInventoryPage(
  query = "",
  page = 1,
  pageSize = KHATA_INVENTORY_PAGE_SIZE,
) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 100));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize;
  const search = sanitizeSearch(query);

  let inventoryQuery = supabase
    .from("inventory_items")
    .select("id,product_name,supplier_name,quantity,unit,purchase_price")
    .gt("quantity", 0)
    .order("product_name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (search) {
    inventoryQuery = inventoryQuery.or(
      `product_name.ilike.%${search}%,supplier_name.ilike.%${search}%`,
    );
  }

  const { data: rawInventory, error: inventoryError } = await inventoryQuery;
  if (inventoryError) throw inventoryError;

  const inventoryRows = (rawInventory ?? []) as InventoryRow[];
  const hasMore = inventoryRows.length > safePageSize;
  const pageRows = hasMore ? inventoryRows.slice(0, safePageSize) : inventoryRows;
  const inventoryIds = pageRows.map((row) => row.id);

  if (inventoryIds.length === 0) {
    return { rows: [] as KhataInventoryOption[], hasMore: false, page: safePage };
  }

  const [productsResult, variantsResult] = await Promise.all([
    supabase
      .from("products")
      .select("id,inventory_id,title,category,selling_price,discount_price,emoji")
      .in("inventory_id", inventoryIds),
    supabase
      .from("product_variants" as any)
      .select("id,inventory_id,product_id,label,selling_price,discount_price,stock,status")
      .in("inventory_id", inventoryIds)
      .eq("status", "active"),
  ]);

  if (productsResult.error) throw productsResult.error;
  if (variantsResult.error) throw variantsResult.error;

  const products = (productsResult.data ?? []) as ProductRow[];
  const variants = (variantsResult.data ?? []) as VariantRow[];
  const productByInventory = new Map<string, ProductRow>();
  const variantByInventory = new Map<string, VariantRow>();

  for (const product of products) {
    if (product.inventory_id && !productByInventory.has(product.inventory_id)) {
      productByInventory.set(product.inventory_id, product);
    }
  }

  for (const variant of variants) {
    if (variant.inventory_id && !variantByInventory.has(variant.inventory_id)) {
      variantByInventory.set(variant.inventory_id, variant);
    }
  }

  const rows = pageRows.map((inventory) => {
    const product = inventory.id ? productByInventory.get(inventory.id) : undefined;
    const variant = inventory.id ? variantByInventory.get(inventory.id) : undefined;
    const stock = num(inventory.quantity);
    const rate = variant
      ? num(variant.discount_price ?? variant.selling_price)
      : product
        ? num(product.discount_price ?? product.selling_price)
        : num(inventory.purchase_price);

    return {
      key: variant?.id ?? inventory.id,
      inventoryId: inventory.id,
      productId: variant?.product_id ?? product?.id ?? undefined,
      productVariantId: variant?.id ?? undefined,
      title: product?.title ?? inventory.product_name,
      subtitle: product?.category ?? inventory.supplier_name ?? "Inventory",
      emoji: product?.emoji ?? "🌾",
      unit: variant?.label ?? inventory.unit ?? "unit",
      rate,
      stock,
    } satisfies KhataInventoryOption;
  });

  return {
    rows,
    hasMore,
    page: safePage,
  };
}
