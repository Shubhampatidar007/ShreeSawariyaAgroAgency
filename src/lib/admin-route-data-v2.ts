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
let sharedLoaded = false;
let sharedLoadPromise: Promise<void> | null = null;

const num = (value: unknown) => Number(value ?? 0);

const CUSTOMER_FULL =
  "id,name,mobile,village,address,joined_on,credit_limit,credit_balance,total_purchases,total_paid,current_due,last_purchase,status,notes";
const CUSTOMER_SUMMARY = "id,status,total_purchases,current_due";
const SUPPLIER_FULL =
  "id,name,company,mobile,email,gstin,address,products_supplied,total_purchases,total_paid,advance,due_balance,last_order,status";
const INVENTORY_FULL =
  "id,product_name,supplier_id,supplier_name,quantity,unit,purchase_price,total_price,min_stock_level,status,last_updated";
const PRODUCT_FULL =
  "id,inventory_id,title,category,selling_price,discount_price,stock,description,tags,images,emoji,visibility,featured,status,published_on";
const VARIANT_ACTIVE = "id,product_id,inventory_id,label,selling_price,discount_price,stock,status";
const CUSTOMER_TX =
  "id,customer_id,entry_date,entry_type,product,quantity,amount,payment,remaining_due,method,remarks";
const SUPPLIER_TX =
  "id,supplier_id,entry_date,entry_type,reference,amount,balance,method,remarks,product_name,quantity,unit,rate";
const ORDER_FULL =
  "id,code,channel,customer_id,customer_name,customer_type,village,mobile,delivery_address,pincode,placed_on,subtotal,discount,tax,total,paid,package_sent_on,payment_due_on,payment_method,payment_status,delivery_status,order_status,invoice_status,remarks,timeline,order_items(id,product,quantity,unit,rate,amount)";
const ORDER_OVERVIEW =
  "id,placed_on,total,paid,order_items(id,product,quantity,unit,rate,amount)";
const PAYMENT_FULL =
  "id,reference,direction,party_id,party_name,entry_date,amount,method,status,order_code,remarks";
const REMINDER_FULL =
  "id,title,audience,target,filter_summary,schedule,channel,due_amount,status,next_run,message,source_id";
const REMINDER_LOG_FULL = "id,reminder_title,recipient,channel,sent_at,delivery,retries";
const NOTIFICATION_FULL = "id,title,body,type,link,is_read,source_id,created_at";
const CMS_FULL =
  "id,name,type,enabled,visibility,sort_order,headline,body,scheduled_from,scheduled_to,image_label";
const AD_FULL = "id,title,placement,audience,status,impressions,clicks,starts_on,runs_until";
const BACKUP_FULL = "id,name,type,size,created_at,status,destination";

const toCustomer = (r: any): Customer => ({
  id: r.id,
  name: r.name ?? "",
  mobile: r.mobile ?? "",
  village: r.village ?? "",
  address: r.address ?? "",
  joinedOn: r.joined_on ?? "",
  creditLimit: num(r.credit_limit),
  creditBalance: num(r.credit_balance),
  totalPurchases: num(r.total_purchases),
  totalPaid: num(r.total_paid),
  currentDue: num(r.current_due),
  lastPurchase: r.last_purchase ?? r.joined_on ?? "",
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
  unit: r.unit ?? "",
  purchasePrice: num(r.purchase_price),
  totalPrice: num(r.total_price),
  minStockLevel: num(r.min_stock_level),
  status: r.status,
  lastUpdated: r.last_updated ?? "",
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
  type: r.entry_type,
  reference: r.reference ?? "",
  amount: num(r.amount),
  balance: num(r.balance),
  method: r.method,
  remarks: r.remarks ?? undefined,
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

async function loadSharedAdminData() {
  if (sharedLoaded) return;
  if (sharedLoadPromise) return sharedLoadPromise;

  sharedLoadPromise = (async () => {
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
    ]);

    const result = [notifications, customers, inventory, reminders].find((r) => r.error);
    if (result?.error) throw result.error;

    applyState({
      notifications: (notifications.data ?? []).map(toNotification),
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
      inventory: (inventory.data ?? []).map(toInventory),
      reminders: (reminders.data ?? []).map(toReminder),
    });

    sharedLoaded = true;
  })().finally(() => {
    sharedLoadPromise = null;
  });

  return sharedLoadPromise;
}

async function runSectionLoad(section: AdminSection) {
  switch (section) {
    case "overview": {
      const [orders, customerLedger, supplierLedger] = await Promise.all([
        supabase.from("orders").select(ORDER_OVERVIEW).order("placed_on", { ascending: false }),
        supabase.from("customer_transactions").select(CUSTOMER_TX).order("entry_date"),
        supabase.from("supplier_transactions").select(SUPPLIER_TX).order("entry_date"),
      ]);
      const result = [orders, customerLedger, supplierLedger].find((r) => r.error);
      if (result?.error) throw result.error;
      applyState({
        orders: (orders.data ?? []).map(toOrder),
        customerLedger: (customerLedger.data ?? []).map(toCustomerLedger),
        supplierLedger: (supplierLedger.data ?? []).map(toSupplierLedger),
      });
      return;
    }
    case "customers": {
      const [customers, customerLedger] = await Promise.all([
        supabase.from("customers").select(CUSTOMER_FULL).order("name"),
        supabase.from("customer_transactions").select(CUSTOMER_TX).order("entry_date"),
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
        supabase.from("inventory_items").select(INVENTORY_FULL).order("product_name"),
        supabase.from("reminders").select(REMINDER_FULL).order("created_at", { ascending: false }).limit(500),
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
        supabase.from("suppliers").select(SUPPLIER_FULL).order("name"),
        supabase.from("supplier_transactions").select(SUPPLIER_TX).order("entry_date"),
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
        supabase.from("products").select(PRODUCT_FULL).order("published_on", { ascending: false }),
        supabase.from("product_variants" as any).select(VARIANT_ACTIVE).eq("status", "active"),
        supabase.from("inventory_items").select(INVENTORY_FULL).order("product_name"),
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
        supabase.from("orders").select(ORDER_FULL).order("placed_on", { ascending: false }),
        supabase.from("customers").select(CUSTOMER_FULL).order("name"),
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
        supabase.from("payments").select(PAYMENT_FULL).order("entry_date", { ascending: false }),
        supabase.from("orders").select(ORDER_FULL).order("placed_on", { ascending: false }),
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
        supabase.from("reminders").select(REMINDER_FULL).order("created_at", { ascending: false }).limit(500),
        supabase.from("reminder_logs").select(REMINDER_LOG_FULL).order("sent_at", { ascending: false }).limit(500),
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
      const { data, error } = await supabase.from("cms_sections").select(CMS_FULL).order("sort_order");
      if (error) throw error;
      applyState({ cmsSections: (data ?? []).map(toCms) });
      return;
    }
    case "advertisements": {
      const { data, error } = await supabase.from("advertisements").select(AD_FULL).order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      applyState({ advertisements: (data ?? []).map(toAd) });
      return;
    }
    case "backups": {
      const { data, error } = await supabase.from("backups").select(BACKUP_FULL).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      applyState({ backups: (data ?? []).map(toBackup) });
      return;
    }
    case "analytics": {
      const [orders, customerLedger, supplierLedger, inventory, customers, products] = await Promise.all([
        supabase.from("orders").select(ORDER_FULL).order("placed_on", { ascending: false }),
        supabase.from("customer_transactions").select(CUSTOMER_TX).order("entry_date"),
        supabase.from("supplier_transactions").select(SUPPLIER_TX).order("entry_date"),
        supabase.from("inventory_items").select(INVENTORY_FULL).order("product_name"),
        supabase.from("customers").select(CUSTOMER_FULL).order("name"),
        supabase.from("products").select(PRODUCT_FULL).order("published_on", { ascending: false }),
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
        supabase.from("customers").select(CUSTOMER_FULL).order("name"),
        supabase.from("products").select(PRODUCT_FULL).order("published_on", { ascending: false }),
        supabase.from("orders").select(ORDER_FULL).order("placed_on", { ascending: false }),
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
  await loadSharedAdminData();
  const section = sectionForAdminPath(pathname);
  if (loadedSections.has(section)) return;
  const running = inFlightSections.get(section);
  if (running) return running;

  const promise = runSectionLoad(section)
    .then(() => loadedSections.add(section))
    .finally(() => inFlightSections.delete(section));

  inFlightSections.set(section, promise);
  return promise;
}

export function isAdminSectionLoaded(pathname: string) {
  return loadedSections.has(sectionForAdminPath(pathname));
}
