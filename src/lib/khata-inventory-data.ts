import { supabase } from "@/integrations/supabase/client";

export const KHATA_INVENTORY_PAGE_SIZE = 40;

type InventoryRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  supplier_name: string | null;
  quantity: number | string | null;
  unit: string | null;
  purchase_price: number | string | null;
  selling_price: number | string | null;
  allow_loose_sale: boolean | null;
};

type ProductRow = {
  id: string;
  inventory_id: string | null;
  title: string;
  category: string | null;
  emoji: string | null;
};

type VariantRow = {
  id: string;
  inventory_id: string | null;
  product_id: string | null;
  label: string | null;
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
  stock: number;
  purchaseCostPerUnit: number;
  referenceSellingPricePerUnit: number;
  allowLooseSale: boolean;
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
  let matchingProductIds: string[] = [];

  if (search) {
    const [productsResult, variantsResult] = await Promise.all([
      supabase
        .from("products")
        .select("id,inventory_id")
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

    matchingProductIds = Array.from(
      new Set((productsResult.data ?? []).map((row) => row.id).filter(Boolean)),
    );
    matchingInventoryIds = Array.from(
      new Set([
        ...(productsResult.data ?? []).map((row) => row.inventory_id),
        ...(variantsResult.data ?? []).map((row: { inventory_id: string | null }) => row.inventory_id),
      ].filter((id): id is string => Boolean(id))),
    );
  }

  let inventoryQuery = supabase
    .from("inventory_items")
    .select("id,product_id,product_name,supplier_name,quantity,unit,purchase_price,selling_price,allow_loose_sale")
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
    if (matchingProductIds.length > 0) {
      searchClauses.push(`product_id.in.(${matchingProductIds.join(",")})`);
    }
    inventoryQuery = inventoryQuery.or(searchClauses.join(","));
  }

  const { data: rawInventory, error: inventoryError } = await inventoryQuery;
  if (inventoryError) throw inventoryError;

  const inventoryRows = (rawInventory ?? []) as InventoryRow[];
  const hasMore = inventoryRows.length > safePageSize;
  const pageRows = hasMore ? inventoryRows.slice(0, safePageSize) : inventoryRows;
  const inventoryIds = pageRows.map((row) => row.id);
  const productIds = Array.from(
    new Set(pageRows.map((row) => row.product_id).filter((id): id is string => Boolean(id))),
  );

  if (inventoryIds.length === 0) {
    return { rows: [] as KhataInventoryOption[], hasMore: false, page: safePage };
  }

  const [productsByInventoryResult, productsByIdResult, variantsResult] = await Promise.all([
    supabase
      .from("products")
      .select("id,inventory_id,title,category,emoji")
      .in("inventory_id", inventoryIds),
    productIds.length > 0
      ? supabase.from("products").select("id,inventory_id,title,category,emoji").in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("product_variants" as any)
      .select("id,inventory_id,product_id,label,status")
      .in("inventory_id", inventoryIds)
      .eq("status", "active"),
  ]);

  if (productsByInventoryResult.error) throw productsByInventoryResult.error;
  if (productsByIdResult.error) throw productsByIdResult.error;
  if (variantsResult.error) throw variantsResult.error;

  const products = [...(productsByInventoryResult.data ?? []), ...(productsByIdResult.data ?? [])] as ProductRow[];
  const variants = (variantsResult.data ?? []) as VariantRow[];
  const productByInventory = new Map<string, ProductRow>();
  const productById = new Map<string, ProductRow>();
  const variantByInventory = new Map<string, VariantRow>();

  for (const product of products) {
    productById.set(product.id, product);
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
    const product =
      (inventory.product_id ? productById.get(inventory.product_id) : undefined) ??
      productByInventory.get(inventory.id);
    const variant = variantByInventory.get(inventory.id);
    const stock = Math.max(num(inventory.quantity), 0);
    const purchaseCostPerUnit = num(inventory.purchase_price);
    const referenceSellingPricePerUnit =
      inventory.selling_price == null ? purchaseCostPerUnit : num(inventory.selling_price);

    return {
      key: inventory.id,
      inventoryId: inventory.id,
      productId: inventory.product_id ?? product?.id ?? undefined,
      productVariantId: variant?.id ?? undefined,
      title: product?.title ?? inventory.product_name,
      subtitle: product?.category ?? inventory.supplier_name ?? "Inventory",
      emoji: product?.emoji ?? "🌾",
      unit: inventory.unit ?? "unit",
      stock,
      purchaseCostPerUnit,
      referenceSellingPricePerUnit,
      allowLooseSale: Boolean(inventory.allow_loose_sale),
    } satisfies KhataInventoryOption;
  });

  return { rows, hasMore, page: safePage };
}
