import { supabase } from "@/integrations/supabase/client";

export type SupplierSession = {
  id: string;
  supplierId: string;
  sessionCode: string;
  sessionDate: string;
  startedAt: string;
  notes?: string;
  deliveryCount: number;
  totalPurchase: number;
  totalAdvance: number;
  totalDue: number;
  status: string;
};

export type SupplierSessionDelivery = {
  id: string;
  sessionId: string;
  supplierId: string;
  date: string;
  type: "purchase" | "payment" | "advance";
  reference: string;
  amount: number;
  balance: number;
  method: string;
  remarks?: string;
  productName?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  inventoryItemId?: string;
};

const num = (value: unknown) => Number(value ?? 0);

export const toSupplierSession = (row: any): SupplierSession => ({
  id: row.id,
  supplierId: row.supplier_id,
  sessionCode: row.session_code,
  sessionDate: row.session_date,
  startedAt: row.started_at,
  notes: row.notes ?? undefined,
  deliveryCount: num(row.delivery_count),
  totalPurchase: num(row.total_purchase),
  totalAdvance: num(row.total_advance),
  totalDue: num(row.total_due),
  status: row.status ?? "closed",
});

const toDelivery = (row: any): SupplierSessionDelivery => ({
  id: row.id,
  sessionId: row.session_id,
  supplierId: row.supplier_id,
  date: row.entry_date,
  type: row.entry_type,
  reference: row.reference ?? "",
  amount: num(row.amount),
  balance: num(row.balance),
  method: row.method ?? "",
  remarks: row.remarks ?? undefined,
  productName: row.product_name ?? undefined,
  quantity: num(row.quantity),
  unit: row.unit ?? "",
  unitPrice: num(row.rate),
  inventoryItemId: row.inventory_item_id ?? undefined,
});

export async function createSupplierSession(input: {
  supplierId: string;
  deliveries: Array<{
    productName: string;
    quantity: number;
    unit: string;
    purchasePrice: number;
    minStockLevel: number;
  }>;
  advancePaid: number;
  advanceMethod: "cash" | "upi" | "bank" | "cheque";
  entryDate?: string;
  notes?: string;
}) {
  const { data, error } = await supabase.rpc("record_supplier_purchase_session" as any, {
    _supplier_id: input.supplierId,
    _deliveries: input.deliveries.map((delivery) => ({
      product_name: delivery.productName,
      quantity: delivery.quantity,
      unit: delivery.unit,
      purchase_price: delivery.purchasePrice,
      min_stock_level: delivery.minStockLevel,
    })),
    _advance_paid: input.advancePaid,
    _advance_method: input.advanceMethod,
    _entry_date: input.entryDate ?? new Date().toISOString().slice(0, 10),
    _notes: input.notes?.trim() || null,
  });
  if (error) throw error;
  return data as string;
}

export async function loadSupplierSessions(supplierId: string) {
  const { data, error } = await supabase
    .from("supplier_sessions")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toSupplierSession);
}

export async function loadSupplierSessionDeliveries(supplierId: string) {
  const { data, error } = await supabase
    .from("supplier_transactions")
    .select("id, session_id, supplier_id, entry_date, entry_type, reference, amount, balance, method, remarks, inventory_item_id, product_name, quantity, unit, rate")
    .eq("supplier_id", supplierId)
    .not("session_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toDelivery);
}
