/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase row shapes are inferred at runtime by the generated client. */
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CustomerLedgerEntry, InventoryItem, SupplierLedgerEntry } from "@/types/business";
import type { Order } from "@/types/operations";

type OverviewState = {
  orders: Order[];
  customers: Array<{ id: string; status: string; currentDue: number }>;
  inventory: InventoryItem[];
  customerLedger: CustomerLedgerEntry[];
  supplierLedger: SupplierLedgerEntry[];
  loading: boolean;
  error: string | null;
};

const emptyState: OverviewState = {
  orders: [],
  customers: [],
  inventory: [],
  customerLedger: [],
  supplierLedger: [],
  loading: true,
  error: null,
};

let state = emptyState;
let loadedAt = 0;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useOverviewStore<T>(selector: (value: OverviewState) => T): T {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => emptyState,
  );
  return selector(snapshot);
}

const num = (value: unknown) => Number(value ?? 0);

const toInventory = (row: any): InventoryItem => ({
  id: row.id,
  productName: row.product_name,
  supplierId: row.supplier_id ?? "",
  supplierName: row.supplier_name ?? "",
  quantity: num(row.quantity),
  unit: row.unit,
  purchasePrice: num(row.purchase_price),
  totalPrice: num(row.total_price),
  minStockLevel: num(row.min_stock_level),
  status: row.status,
  lastUpdated: row.last_updated,
});

const toCustomerLedger = (row: any): CustomerLedgerEntry => ({
  id: row.id,
  customerId: row.customer_id,
  date: row.entry_date,
  entryType: row.entry_type,
  product: row.product ?? "",
  quantity: num(row.quantity),
  amount: num(row.amount),
  payment: num(row.payment),
  remainingDue: num(row.remaining_due),
  method: row.method,
  remarks: row.remarks ?? undefined,
});

const toSupplierLedger = (row: any): SupplierLedgerEntry => ({
  id: row.id,
  supplierId: row.supplier_id,
  date: row.entry_date,
  type: row.entry_type,
  reference: row.reference ?? "",
  amount: num(row.amount),
  balance: num(row.balance),
  method: row.method,
  remarks: row.remarks ?? undefined,
});

const toOrder = (row: any): Order => ({
  id: row.id,
  code: row.code,
  channel: row.channel,
  customerId: row.customer_id ?? undefined,
  customerName: row.customer_name ?? "",
  customerType: row.customer_type,
  village: row.village ?? "",
  mobile: row.mobile ?? "",
  placedOn: row.placed_on,
  items: (row.order_items ?? []).map((item: any) => ({
    id: item.id,
    product: item.product,
    quantity: num(item.quantity),
    unit: item.unit,
    rate: num(item.rate),
    amount: num(item.amount),
  })),
  subtotal: num(row.subtotal),
  discount: num(row.discount),
  tax: num(row.tax),
  total: num(row.total),
  paid: num(row.paid),
  paymentMethod: row.payment_method,
  paymentStatus: row.payment_status,
  deliveryStatus: row.delivery_status,
  orderStatus: row.order_status,
  invoiceStatus: row.invoice_status,
  remarks: row.remarks ?? undefined,
  timeline: row.timeline ?? [],
});

export async function loadAdminOverviewData(options: { force?: boolean } = {}) {
  if (typeof window === "undefined") return;

  const freshFor = 30_000;
  if (!options.force && loadedAt && Date.now() - loadedAt < freshFor) return;
  if (loadPromise) return loadPromise;

  state = { ...state, loading: true, error: null };
  emit();

  const start = new Date();
  start.setDate(start.getDate() - 364);
  const from = start.toISOString().slice(0, 10);

  loadPromise = (async () => {
    try {
      const [orders, customers, inventory, customerLedger, supplierLedger] =
        await Promise.all([
          supabase
            .from("orders")
            .select(
              "id,code,channel,customer_id,customer_name,customer_type,village,mobile,placed_on,subtotal,discount,tax,total,paid,payment_method,payment_status,delivery_status,order_status,invoice_status,remarks,timeline,order_items(id,product,quantity,unit,rate,amount)",
            )
            .gte("placed_on", from)
            .order("placed_on", { ascending: false }),
          supabase.from("customers").select("id,status,current_due"),
          supabase
            .from("inventory_items")
            .select(
              "id,product_name,supplier_id,supplier_name,quantity,unit,purchase_price,total_price,min_stock_level,status,last_updated",
            )
            .order("product_name"),
          supabase
            .from("customer_transactions")
            .select(
              "id,customer_id,entry_date,entry_type,product,quantity,amount,payment,remaining_due,method,remarks",
            )
            .gte("entry_date", from)
            .order("entry_date", { ascending: true }),
          supabase
            .from("supplier_transactions")
            .select("id,supplier_id,entry_date,entry_type,reference,amount,balance,method,remarks")
            .gte("entry_date", from)
            .order("entry_date", { ascending: true }),
        ]);

      const firstError = [
        orders,
        customers,
        inventory,
        customerLedger,
        supplierLedger,
      ].find((result) => result.error);

      if (firstError?.error) throw firstError.error;

      state = {
        orders: (orders.data ?? []).map(toOrder),
        customers: (customers.data ?? []).map((row: any) => ({
          id: row.id,
          status: row.status,
          currentDue: num(row.current_due),
        })),
        inventory: (inventory.data ?? []).map(toInventory),
        customerLedger: (customerLedger.data ?? []).map(toCustomerLedger),
        supplierLedger: (supplierLedger.data ?? []).map(toSupplierLedger),
        loading: false,
        error: null,
      };
      loadedAt = Date.now();
      emit();
    } catch (error) {
      state = {
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load dashboard data.",
      };
      emit();
      throw error;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}
