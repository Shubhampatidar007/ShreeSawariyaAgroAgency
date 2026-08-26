import { supabase } from "@/integrations/supabase/client";
import type {
  Customer,
  CustomerLedgerEntry,
  InventoryItem,
  ProductVariant,
  PublishedProduct,
  Supplier,
  SupplierLedgerEntry,
} from "@/types/business";
import type {
  Advertisement,
  Backup,
  CmsSection,
  AdminNotification,
  PaymentRecord,
  Reminder,
  ReminderLog,
} from "@/types";
import type { Order } from "@/types/operations";
import { shopStore } from "@/lib/shop-store";

type AdminSection =
  | "overview"
  | "customers"
  | "inventory"
  | "suppliers"
  | "products"
  | "sales"
  | "payments"
  | "reminders"
  | "cms"
  | "advertisements"
  | "backups"
  | "analytics"
  | "search";

const loadedSections = new Set<AdminSection>();
const inFlightSections = new Map<AdminSection, Promise<void>>();

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

const toVariant = (r: any): ProductVariant => ({
  id: r.id,
  productId: r.product_id ?? undefined,
  inventoryId: r.inventory_id ?? undefined,
  label: r.label ?? "unit",
  sellingPrice: num(r.selling_price),
  discountPrice: r.discount_price == null ? undefined : num(r.discount_price),
  stock: num(r.stock),
  status: r.status ?? "active",
});

const toProduct = (r: any, variants: ProductVariant[] = []): PublishedProduct => ({
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
  variants,
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
  entryType: r.entry_type,
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
  deliveryAddress: r.delivery_address ?? "",
  pincode: r.pincode ?? "",
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
  packageSentOn: r.package_sent_on ?? undefined,
  paymentDueOn: r.payment_due_on ?? undefined,
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

const toReminderLog = (r: any): ReminderLog => ({
  id: r.id,
  reminderTitle: r.reminder_title,
  recipient: r.recipient ?? "",
  channel: r.channel,
  sentAt: r.sent_at,
  delivery: r.delivery,
  retries: r.retries ?? 0,
});

const toCms = (r: any): CmsSection => ({
  id: r.id,
  name: r.name,
  type: r.type,
  enabled: !!r.enabled,
  visibility: r.visibility,
  order: r.sort_order,
  headline: r.headline ?? "",
  body: r.body ?? "",
  scheduledFrom: r.scheduled_from ?? undefined,
  scheduledTo: r.scheduled_to ?? undefined,
  imageLabel: r.image_label ?? "",
});

const toAd = (r: any): Advertisement => ({
  id: r.id,
  title: r.title,
  placement: r.placement,
  audience: r.audience,
  status: r.status,
  impressions: r.impressions ?? 0,
  clicks: r.clicks ?? 0,
  startsOn: r.starts_on,
  runsUntil: r.runs_until,
});

const toBackup = (r: any): Backup => ({
  id: r.id,
  name: r.name,
  type: r.type,
  size: r.size,
  createdAt: r.created_at,
  status: r.status,
  destination: r.destination,
});

const toNotification = (r: any): AdminNotification => ({
  id: r.id,
  title: r.title,
  body: r.body ?? "",
  type: r.type,
  link: r.link ?? undefined,
  isRead: !!r.is_read,
  sourceId: r.source_id ?? undefined,
  createdAt: r.created_at,
});

function notifyShopStore() {
  const snapshot = shopStore.get() as any;
  shopStore.setDraftProduct(snapshot.draftProduct ?? null);
}

function applyState(patch: Record<string, unknown>) {
  Object.assign(shopStore.get() as any, patch, { loading: false });
  notifyShopStore();
}

async function runSectionLoad(section: AdminSection) {
  switch (section) {
    case "overview": {
      const [orders, customerLedger, supplierLedger, inventory, customers] = await Promise.all([
        supabase
          .from("orders")
          .select("id,placed_on,subtotal,discount,total,paid,order_items(id,product,quantity,unit,rate,amount)")
          .order("placed_on", { ascending: false }),
        supabase
          .from("customer_transactions")
          .select("id,customer_id,entry_date,entry_type,product,quantity,amount,payment,remaining_due,method,remarks")
          .order("entry_date"),
        supabase
          .from("supplier_transactions")
          .select("id,supplier_id,entry_date,entry_type,reference,amount,balance,method,remarks,product_name,quantity,unit,rate")
          .order("entry_date"),
        supabase
          .from("inventory_items")
          .select("id,product_name,supplier_id,supplier_name,quantity,unit,purchase_price,total_price,min_stock_level,status,last_updated")
          .order("product_name"),
        supabase
          .from("customers")
          .select("id,status,current_due,total_purchases")
          .order("id"),
      ]);
      const result = [orders, customerLedger, supplierLedger, inventory, customers].find((r) => r.error);
      if (result?.error) throw result.error;
      applyState({
        orders: (orders.data ?? []).map(toOrder),
        customerLedger: (customerLedger.data ?? []).map(toCustomerLedger),
        supplierLedger: (supplierLedger.data ?? []).map(toSupplierLedger),
        inventory: (inventory.data ?? []).map(toInventory),
        customers: (customers.data ?? []).map((r) => ({
          id: r.id,
          name: "",
          mobile: "",
          village: "",
          address: "",
          joinedOn: "",
          creditLimit: 0,
          creditBalance: 0,
          totalPurchases: num(r.total_purchases),
          totalPaid: 0,
          currentDue: num(r.current_due),
          lastPurchase: "",
          status: r.status,
        })),
      });
      return;
    }
    case "customers": {
      const [customers, customerLedger] = await Promise.all([
        supabase.from("customers").select("*").order("name"),
        supabase.from("customer_transactions").select("*").order("entry_date"),
      ]);
      const result = [customers, customerLedger].find((r) => r.error);
      if (result?.error) throw result.error;
      applyState({
        customers: (customers.data ?? []).map(toCustomer),
        customerLedger: (customerLedger.data ?? []).map(toCustomerLedger),
      });
      return;
    }
    case "inventory": {
      const [inventory, reminders] = await Promise.all([
        supabase.from("inventory_items").select("*").order("product_name"),
        supabase.from("reminders").select("*").order("created_at", { ascending: false }),
      ]);
      const result = [inventory, reminders].find((r) => r.error);
      if (result?.error) throw result.error;
      applyState({
        inventory: (inventory.data ?? []).map(toInventory),
        reminders: (reminders.data ?? []).map(toReminder),
      });
      return;
    }
    case "suppliers": {
      const [suppliers, supplierLedger] = await Promise.all([
        supabase.from("suppliers").select("*").order("name"),
        supabase.from("supplier_transactions").select("*").order("entry_date"),
      ]);
      const result = [suppliers, supplierLedger].find((r) => r.error);
      if (result?.error) throw result.error;
      applyState({
        suppliers: (suppliers.data ?? []).map(toSupplier),
        supplierLedger: (supplierLedger.data ?? []).map(toSupplierLedger),
      });
      return;
    }
    case "products": {
      const [products, variants, inventory] = await Promise.all([
        supabase.from("products").select("*").order("published_on", { ascending: false }),
        supabase.from("product_variants" as any).select("*").eq("status", "active"),
        supabase.from("inventory_items").select("*").order("product_name"),
      ]);
      const result = [products, variants, inventory].find((r) => r.error);
      if (result?.error) throw result.error;
      const byProduct = new Map<string, ProductVariant[]>();
      for (const row of variants.data ?? []) {
        const variant = toVariant(row);
        if (!variant.productId) continue;
        const list = byProduct.get(variant.productId) ?? [];
        list.push(variant);
        byProduct.set(variant.productId, list);
      }
      applyState({
        products: (products.data ?? []).map((row) => toProduct(row, byProduct.get(row.id) ?? [])),
        inventory: (inventory.data ?? []).map(toInventory),
      });
      return;
    }
    case "sales": {
      const [orders, customers] = await Promise.all([
        supabase.from("orders").select("*, order_items(*)").order("placed_on", { ascending: false }),
        supabase.from("customers").select("*").order("name"),
      ]);
      const result = [orders, customers].find((r) => r.error);
      if (result?.error) throw result.error;
      applyState({
        orders: (orders.data ?? []).map(toOrder),
        customers: (customers.data ?? []).map(toCustomer),
      });
      return;
    }
    case "payments": {
      const [payments, orders] = await Promise.all([
        supabase.from("payments").select("*").order("entry_date", { ascending: false }),
        supabase.from("orders").select("*, order_items(*)").order("placed_on", { ascending: false }),
      ]);
      const result = [payments, orders].find((r) => r.error);
      if (result?.error) throw result.error;
      applyState({
        payments: (payments.data ?? []).map(toPayment),
        orders: (orders.data ?? []).map(toOrder),
      });
      return;
    }
    case "reminders": {
      const [reminders, logs] = await Promise.all([
        supabase.from("reminders").select("*").order("created_at", { ascending: false }),
        supabase.from("reminder_logs").select("*").order("sent_at", { ascending: false }),
      ]);
      const result = [reminders, logs].find((r) => r.error);
      if (result?.error) throw result.error;
      applyState({
        reminders: (reminders.data ?? []).map(toReminder),
        reminderLogs: (logs.data ?? []).map(toReminderLog),
      });
      return;
    }
    case "cms": {
      const { data, error } = await supabase.from("cms_sections").select("*").order("sort_order");
      if (error) throw error;
      applyState({ cmsSections: (data ?? []).map(toCms) });
      return;
    }
    case "advertisements": {
      const { data, error } = await supabase.from("advertisements").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      applyState({ advertisements: (data ?? []).map(toAd) });
      return;
    }
    case "backups": {
      const { data, error } = await supabase.from("backups").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      applyState({ backups: (data ?? []).map(toBackup) });
      return;
    }
    case "analytics": {
      const [orders, customerLedger, supplierLedger, inventory, customers, products] = await Promise.all([
        supabase.from("orders").select("*, order_items(*)").order("placed_on", { ascending: false }),
        supabase.from("customer_transactions").select("*").order("entry_date"),
        supabase.from("supplier_transactions").select("*").order("entry_date"),
        supabase.from("inventory_items").select("*").order("product_name"),
        supabase.from("customers").select("*").order("name"),
        supabase.from("products").select("*").order("published_on", { ascending: false }),
      ]);
      const result = [orders, customerLedger, supplierLedger, inventory, customers, products].find((r) => r.error);
      if (result?.error) throw result.error;
      applyState({
        orders: (orders.data ?? []).map(toOrder),
        customerLedger: (customerLedger.data ?? []).map(toCustomerLedger),
        supplierLedger: (supplierLedger.data ?? []).map(toSupplierLedger),
        inventory: (inventory.data ?? []).map(toInventory),
        customers: (customers.data ?? []).map(toCustomer),
        products: (products.data ?? []).map((row) => toProduct(row)),
      });
      return;
    }
    case "search": {
      const [customers, products, orders] = await Promise.all([
        supabase.from("customers").select("*").order("name"),
        supabase.from("products").select("*").order("published_on", { ascending: false }),
        supabase.from("orders").select("*, order_items(*)").order("placed_on", { ascending: false }),
      ]);
      const result = [customers, products, orders].find((r) => r.error);
      if (result?.error) throw result.error;
      applyState({
        customers: (customers.data ?? []).map(toCustomer),
        products: (products.data ?? []).map((row) => toProduct(row)),
        orders: (orders.data ?? []).map(toOrder),
      });
      return;
    }
  }
}

export function sectionForAdminPath(pathname: string): AdminSection {
  if (pathname === "/admin" || pathname === "/admin/") return "overview";
  if (pathname.startsWith("/admin/customers") || pathname.startsWith("/admin/khata")) return "customers";
  if (pathname.startsWith("/admin/inventory")) return "inventory";
  if (pathname.startsWith("/admin/suppliers")) return "suppliers";
  if (pathname.startsWith("/admin/products")) return "products";
  if (pathname.startsWith("/admin/sales") || pathname.startsWith("/admin/orders")) return "sales";
  if (pathname.startsWith("/admin/payments")) return "payments";
  if (pathname.startsWith("/admin/reminders") || pathname.startsWith("/admin/inventory-reminders")) return "reminders";
  if (pathname.startsWith("/admin/cms")) return "cms";
  if (pathname.startsWith("/admin/advertisements")) return "advertisements";
  if (pathname.startsWith("/admin/backups")) return "backups";
  if (pathname.startsWith("/admin/analytics") || pathname.startsWith("/admin/reports")) return "analytics";
  if (pathname.startsWith("/admin/search")) return "search";
  return "overview";
}

export async function loadAdminRouteData(pathname: string) {
  const section = sectionForAdminPath(pathname);
  if (loadedSections.has(section)) return;
  const running = inFlightSections.get(section);
  if (running) return running;

  const promise = runSectionLoad(section)
    .then(() => {
      loadedSections.add(section);
    })
    .finally(() => {
      inFlightSections.delete(section);
    });

  inFlightSections.set(section, promise);
  return promise;
}

export function isAdminSectionLoaded(pathname: string) {
  return loadedSections.has(sectionForAdminPath(pathname));
}
