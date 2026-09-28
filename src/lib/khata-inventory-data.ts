import { supabase } from "@/integrations/supabase/client";

export const KHATA_INVENTORY_PAGE_SIZE = 40;

type InventoryRow = {
  id: string;
  product_name: string;
  supplier_name: string | null;
  quantity: number | string | null;
  unit: string | null;
  purchase_price: number | string | null;
  selling_price: number | string | null;
  base_unit: string | null;
  package_size: number | string | null;
  base_quantity: number | string | null;
  allow_loose_sale: boolean | null;
  purchase_price_per_base_unit: number | string | null;
  selling_price_per_base_unit: number | string | null;
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
  baseUnit: string;
  packageSize: number;
  baseStock: number;
  allowLooseSale: boolean;
  suggestedRate: number;
};

const num = (value: unknown) => Number(value ?? 0);

const sanitizeSearch = (value: string) =>
  value.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();

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

  let matchingInventoryIds: string[] = [];

  if (search) {
    const [productsResult, variantsResult] = await Promise.all([
      supabase
        .from("products")
        .select("inventory_id")
        .not("inventory_id", "is", null)
        .or(`title.ilike.%${search}%,category.ilike.%${search}%`),
      supabase
        .from("product_variants" as any)
        .select("inventory_id")
        .eq("status", "active")
        .not("inventory_id", "is", null)
        .ilike("label", `%${search}%`),
    ]);

    if (productsResult.error) throw productsResult.error;
    if (variantsResult.error) throw variantsResult.error;

    matchingInventoryIds = Array.from(
      new Set(
        [
          ...(productsResult.data ?? []).map((row) => row.inventory_id),
          ...(variantsResult.data ?? []).map((row: { inventory_id: string | null }) => row.inventory_id),
        ].filter((id): id is string => Boolean(id)),
      ),
    );
  }

  let inventoryQuery = supabase
    .from("inventory_items")
    .select("id,product_name,supplier_name,quantity,unit,purchase_price,selling_price,base_unit,package_size,base_quantity,allow_loose_sale,purchase_price_per_base_unit,selling_price_per_base_unit")
    .gt("quantity", 0)
    .order("product_name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (search) {
    const searchClauses = [
      `product_name.ilike.%${search}%`,
      `supplier_name.ilike.%${search}%`,
    ];

    if (matchingInventoryIds.length > 0) {
      searchClauses.push(`id.in.(${matchingInventoryIds.join(",")})`);
    }

    inventoryQuery = inventoryQuery.or(searchClauses.join(","));
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
    const allowLooseSale = Boolean(inventory.allow_loose_sale);
    const packageSize = Math.max(num(inventory.package_size) || 1, 0.000001);
    const baseUnit = inventory.base_unit?.trim() || inventory.unit?.trim() || "unit";
    const baseStock = Math.max(
      num(inventory.base_quantity) || stock * packageSize,
      0,
    );

    const packageRate = variant
      ? num(variant.discount_price ?? variant.selling_price)
      : product
        ? num(product.discount_price ?? product.selling_price)
        : num(inventory.selling_price ?? inventory.purchase_price);

    const normalizedSellingRate = num(inventory.selling_price_per_base_unit);
    const normalizedPurchaseRate = num(inventory.purchase_price_per_base_unit);
    const derivedSellingRate = num(inventory.selling_price) / packageSize;
    const derivedPurchaseRate = num(inventory.purchase_price) / packageSize;

    const suggestedRate = allowLooseSale
      ? (normalizedSellingRate > 0
          ? normalizedSellingRate
          : normalizedPurchaseRate > 0
            ? normalizedPurchaseRate
            : derivedSellingRate > 0
              ? derivedSellingRate
              : derivedPurchaseRate)
      : packageRate;

    const rate = Number.isFinite(suggestedRate) && suggestedRate >= 0 ? suggestedRate : packageRate;

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
      stock: allowLooseSale ? baseStock : stock,
      baseUnit,
      packageSize,
      baseStock,
      allowLooseSale,
      suggestedRate: rate,
    } satisfies KhataInventoryOption;
  });

  return {
    rows,
    hasMore,
    page: safePage,
  };
}
