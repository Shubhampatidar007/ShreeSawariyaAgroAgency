import { supabase } from "@/integrations/supabase/client";
import type { Customer, InventoryItem, PublishedProduct, Supplier } from "@/types/business";
import type { Reminder } from "@/types";

const num = (value: unknown) => Number(value ?? 0);

const toCustomer = (r: any): Customer => ({
  id: r.id,
  name: r.name,
  mobile: r.mobile,
  village: r.village ?? "",
  address: r.address ?? "",
  joinedOn: r.joined_on,
  creditLimit: num(r.credit_limit),
  creditBalance: num(r.credit_balance),
  totalPurchases: num(r.total_purchases),
  totalPaid: num(r.total_paid),
  currentDue: num(r.current_due),
  lastPurchase: r.last_purchase ?? r.joined_on,
  status: r.status,
  notes: r.notes ?? undefined,
});

const toSupplier = (r: any): Supplier => ({
  id: r.id,
  name: r.name,
  company: r.company ?? "",
  mobile: r.mobile ?? "",
  email: r.email ?? "",
  gstin: r.gstin ?? "",
  address: r.address ?? "",
  productsSupplied: r.products_supplied ?? [],
  totalPurchases: num(r.total_purchases),
  totalPaid: num(r.total_paid),
  advance: num(r.advance),
  dueBalance: num(r.due_balance),
  lastOrder: r.last_order ?? "",
  status: r.status,
});

const toInventory = (r: any): InventoryItem => ({
  id: r.id,
  productName: r.product_name,
  supplierId: r.supplier_id ?? "",
  supplierName: r.supplier_name ?? "",
  quantity: num(r.quantity),
  unit: r.unit,
  purchasePrice: num(r.purchase_price),
  totalPrice: num(r.total_price),
  minStockLevel: num(r.min_stock_level),
  status: r.status,
  lastUpdated: r.last_updated,
});

const toProduct = (r: any): PublishedProduct => ({
  id: r.id,
  inventoryId: r.inventory_id ?? "",
  title: r.title,
  category: r.category,
  sellingPrice: num(r.selling_price),
  discountPrice: r.discount_price == null ? undefined : num(r.discount_price),
  stock: num(r.stock),
  description: r.description ?? "",
  tags: r.tags ?? [],
  images: r.images ?? [],
  emoji: r.emoji ?? "🌾",
  visibility: r.visibility,
  featured: !!r.featured,
  status: r.status,
  publishedOn: r.published_on,
});

const toReminder = (r: any): Reminder => ({
  id: r.id,
  title: r.title,
  audience: r.audience ?? "",
  target: r.target,
  filterSummary: r.filter_summary ?? "",
  schedule: r.schedule,
  channel: r.channel,
  dueAmount: num(r.due_amount),
  status: r.status,
  nextRun: r.next_run,
  message: r.message ?? "",
  sourceId: r.source_id ?? undefined,
});

/**
 * Feature-scoped reads used while admin modules are migrated away from the
 * legacy all-data loader. These functions intentionally only read; existing
 * shopStore mutations remain responsible for business logic.
 */
export async function loadCustomersFeature() {
  const { data, error } = await supabase.from("customers").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map(toCustomer);
}

export async function loadSuppliersFeature() {
  const { data, error } = await supabase.from("suppliers").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map(toSupplier);
}

export async function loadInventoryFeature() {
  const [inventory, reminders, products] = await Promise.all([
    supabase.from("inventory_items").select("*").order("product_name"),
    supabase.from("reminders").select("*").eq("target", "inventory").order("created_at", { ascending: false }),
    supabase.from("products").select("*").order("published_on", { ascending: false }),
  ]);

  if (inventory.error) throw inventory.error;
  if (reminders.error) throw reminders.error;
  if (products.error) throw products.error;

  return {
    inventory: (inventory.data ?? []).map(toInventory),
    reminders: (reminders.data ?? []).map(toReminder),
    products: (products.data ?? []).map(toProduct),
  };
}
