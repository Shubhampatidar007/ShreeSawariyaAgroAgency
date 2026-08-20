import { supabase } from "@/integrations/supabase/client";
import type { Customer, InventoryItem } from "@/types/business";
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

export async function loadCustomersFeature() {
  const { data, error } = await supabase.from("customers").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map(toCustomer);
}

export async function loadInventoryFeature() {
  const [inventory, reminders] = await Promise.all([
    supabase.from("inventory_items").select("*").order("product_name"),
    supabase.from("reminders").select("*").eq("target", "inventory").order("created_at", { ascending: false }),
  ]);

  if (inventory.error) throw inventory.error;
  if (reminders.error) throw reminders.error;

  return {
    inventory: (inventory.data ?? []).map(toInventory),
    reminders: (reminders.data ?? []).map(toReminder),
  };
}
