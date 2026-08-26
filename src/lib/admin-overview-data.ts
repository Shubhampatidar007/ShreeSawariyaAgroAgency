import { supabase } from "@/integrations/supabase/client";
import type { AdminNotification, Reminder } from "@/types";
import type { Customer, InventoryItem } from "@/types/business";
import { shopStore } from "@/lib/shop-store";
import { loadAdminOverviewMetrics } from "@/lib/admin-overview-metrics";

const NOTIFICATION_FULL = "id,title,body,type,link,is_read,source_id,created_at";
const CUSTOMER_SUMMARY = "id,status,total_purchases,current_due";
const INVENTORY_FULL =
  "id,product_name,supplier_id,supplier_name,quantity,unit,purchase_price,total_price,min_stock_level,status,last_updated";
const REMINDER_FULL =
  "id,title,audience,target,filter_summary,schedule,channel,due_amount,status,next_run,message,source_id";

const num = (value: unknown) => Number(value ?? 0);

const toCustomerSummary = (row: any): Customer => ({
  id: row.id,
  name: "",
  mobile: "",
  village: "",
  address: "",
  joinedOn: "",
  creditLimit: 0,
  creditBalance: 0,
  totalPurchases: num(row.total_purchases),
  totalPaid: 0,
  currentDue: num(row.current_due),
  lastPurchase: "",
  status: row.status,
});

const toInventory = (row: any): InventoryItem => ({
  id: row.id,
  productName: row.product_name,
  supplierId: row.supplier_id ?? "",
  supplierName: row.supplier_name ?? "",
  quantity: num(row.quantity),
  unit: row.unit ?? "",
  purchasePrice: num(row.purchase_price),
  totalPrice: num(row.total_price),
  minStockLevel: num(row.min_stock_level),
  status: row.status,
  lastUpdated: row.last_updated ?? "",
});

const toNotification = (row: any): AdminNotification => ({
  id: row.id,
  title: row.title,
  body: row.body ?? "",
  type: row.type,
  link: row.link ?? undefined,
  isRead: !!row.is_read,
  sourceId: row.source_id ?? undefined,
  createdAt: row.created_at,
});

const toReminder = (row: any): Reminder => ({
  id: row.id,
  title: row.title,
  audience: row.audience ?? "",
  target: row.target,
  filterSummary: row.filter_summary ?? "",
  schedule: row.schedule,
  channel: row.channel,
  dueAmount: num(row.due_amount),
  status: row.status,
  nextRun: row.next_run,
  message: row.message ?? "",
  sourceId: row.source_id ?? undefined,
});

let loaded = false;
let inFlight: Promise<void> | null = null;

function applyState(patch: Record<string, unknown>) {
  Object.assign(shopStore.get() as any, patch, { loading: false });
  const snapshot = shopStore.get() as any;
  shopStore.setDraftProduct(snapshot.draftProduct ?? null);
}

export async function loadAdminOverviewData({ force = false } = {}) {
  if (!force && loaded) {
    await loadAdminOverviewMetrics();
    return;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const [notifications, customers, inventory, reminders] = await Promise.all([
      supabase
        .from("notifications")
        .select(NOTIFICATION_FULL)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("customers").select(CUSTOMER_SUMMARY).order("id"),
      supabase.from("inventory_items").select(INVENTORY_FULL).order("product_name"),
      supabase
        .from("reminders")
        .select(REMINDER_FULL)
        .eq("status", "active")
        .eq("target", "inventory")
        .order("created_at", { ascending: false })
        .limit(100),
      loadAdminOverviewMetrics({ force }),
    ]);

    const result = [notifications, customers, inventory, reminders].find((item) => item.error);
    if (result?.error) throw result.error;

    applyState({
      notifications: (notifications.data ?? []).map(toNotification),
      customers: (customers.data ?? []).map(toCustomerSummary),
      inventory: (inventory.data ?? []).map(toInventory),
      reminders: (reminders.data ?? []).map(toReminder),
    });

    loaded = true;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export function isAdminOverviewLoaded() {
  return loaded;
}
