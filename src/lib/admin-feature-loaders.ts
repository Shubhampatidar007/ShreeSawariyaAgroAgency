import { supabase } from "@/integrations/supabase/client";
import type { Customer, CustomerLedgerEntry, InventoryItem, PublishedProduct, Supplier, SupplierLedgerEntry } from "@/types/business";
import type { Order } from "@/types/operations";
import type { PaymentRecord, Reminder } from "@/types";

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

const toCustomerLedger = (r: any): CustomerLedgerEntry => ({
  id: r.id,
  customerId: r.customer_id,
  date: r.entry_date,
  entryType: r.entry_type,
  product: r.product ?? "",
  quantity: num(r.quantity),
  amount: num(r.amount),
  payment: num(r.payment),
  remainingDue: num(r.remaining_due),
  method: r.method,
  remarks: r.remarks ?? undefined,
});

const toSupplierLedger = (r: any): SupplierLedgerEntry => ({
  id: r.id,
  supplierId: r.supplier_id,
  date: r.entry_date,
  type: r.entry_type,
  reference: r.reference ?? "",
  amount: num(r.amount),
  balance: num(r.balance),
  method: r.method,
  remarks: r.remarks ?? undefined,
  productName: r.product_name ?? undefined,
  quantity: r.quantity !== undefined ? num(r.quantity) : undefined,
  unit: r.unit ?? undefined,
  unitPrice: r.rate !== undefined ? num(r.rate) : undefined,
});

const toOrder = (r: any): Order => ({
  id: r.id,
  code: r.code,
  channel: r.channel,
  customerId: r.customer_id ?? undefined,
  customerName: r.customer_name ?? "",
  customerType: r.customer_type,
  village: r.village ?? "",
  mobile: r.mobile ?? "",
  placedOn: r.placed_on,
  items: (r.order_items ?? []).map((i: any) => ({
    id: i.id,
    product: i.product,
    quantity: num(i.quantity),
    unit: i.unit,
    rate: num(i.rate),
    amount: num(i.amount),
  })),
  subtotal: num(r.subtotal),
  discount: num(r.discount),
  tax: num(r.tax),
  total: num(r.total),
  paid: num(r.paid),
  paymentMethod: r.payment_method,
  paymentStatus: r.payment_status,
  deliveryStatus: r.delivery_status,
  orderStatus: r.order_status,
  invoiceStatus: r.invoice_status,
  remarks: r.remarks ?? undefined,
  timeline: r.timeline ?? [],
});

const toPayment = (r: any): PaymentRecord => ({
  id: r.id,
  reference: r.reference,
  direction: r.direction,
  partyId: r.party_id ?? "",
  partyName: r.party_name ?? "",
  date: r.entry_date,
  amount: num(r.amount),
  method: r.method,
  status: r.status,
  orderCode: r.order_code ?? undefined,
  remarks: r.remarks ?? undefined,
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

/** Feature-scoped reads only; existing mutations/business logic stay in shopStore. */
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

export async function loadSalesFeature() {
  const [orders, customerLedger] = await Promise.all([
    supabase.from("orders").select("*, order_items(*)").order("placed_on", { ascending: false }),
    supabase.from("customer_transactions").select("*").order("entry_date", { ascending: false }),
  ]);
  if (orders.error) throw orders.error;
  if (customerLedger.error) throw customerLedger.error;
  return {
    orders: (orders.data ?? []).map(toOrder),
    customerLedger: (customerLedger.data ?? []).map(toCustomerLedger),
  };
}

export async function loadPaymentsFeature() {
  const { data, error } = await supabase.from("payments").select("*").order("entry_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toPayment);
}

export async function loadRemindersFeature() {
  const [reminders, logs] = await Promise.all([
    supabase.from("reminders").select("*").order("created_at", { ascending: false }),
    supabase.from("reminder_logs").select("*").order("sent_at", { ascending: false }),
  ]);
  if (reminders.error) throw reminders.error;
  if (logs.error) throw logs.error;
  return {
    reminders: (reminders.data ?? []).map(toReminder),
    reminderLogs: logs.data ?? [],
  };
}
