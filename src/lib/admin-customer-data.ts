import { supabase } from "@/integrations/supabase/client";
import type { CustomerLedgerEntry, CustomerSaleItem } from "@/types/business";
import type { CustomerProfitOrder, CustomerProfitSaleEntry } from "@/lib/business-metrics";

export const CUSTOMER_KHATA_PAGE_SIZE = 20;

const toCustomerLedger = (r: any): CustomerLedgerEntry => ({
  id: r.id,
  customerId: r.customer_id,
  date: r.entry_date,
  entryType: r.entry_type === "sale" ? "purchase" : r.entry_type,
  product: r.product ?? "",
  quantity: Number(r.quantity ?? 0),
  amount: Number(r.amount ?? 0),
  payment: Number(r.payment ?? 0),
  remainingDue: Number(r.remaining_due ?? 0),
  method: r.method,
  remarks: r.remarks ?? undefined,
});

const CUSTOMER_LEDGER_SELECT =
  "id,customer_id,entry_date,entry_type,product,quantity,amount,payment,remaining_due,method,remarks,created_at";

export async function loadCustomerLedger(customerId: string) {
  const { data, error } = await supabase
    .from("customer_transactions")
    .select(CUSTOMER_LEDGER_SELECT)
    .eq("customer_id", customerId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toCustomerLedger);
}

export async function loadCustomerKhataPage(
  customerId: string,
  page: number,
  pageSize = CUSTOMER_KHATA_PAGE_SIZE,
) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 100));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const { data, error, count } = await supabase
    .from("customer_transactions")
    .select(CUSTOMER_LEDGER_SELECT, { count: "exact" })
    .eq("customer_id", customerId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const total = count ?? 0;
  return {
    rows: (data ?? []).map(toCustomerLedger),
    total,
    page: safePage,
    pageSize: safePageSize,
    pageCount: Math.max(1, Math.ceil(total / safePageSize)),
  };
}


const CUSTOMER_PROFIT_SALE_SELECT =
  "id,customer_id,entry_date,product,quantity,amount";

const CUSTOMER_PROFIT_ORDER_SELECT =
  "id,customer_id,placed_on,order_items(product,quantity,amount)";

const CUSTOMER_PROFIT_ITEM_SELECT =
  "id,transaction_id,product_id,product_variant_id,product,quantity,unit,rate,amount,purchase_cost,admin_price_inc,customer_transactions!inner(entry_date,entry_type,customer_id)";

const toCustomerProfitOrder = (r: any): CustomerProfitOrder => ({
  placedOn: r.placed_on,
  items: (r.order_items ?? []).map((item: any) => ({
    product: item.product ?? "",
    quantity: Number(item.quantity ?? 0),
    amount: Number(item.amount ?? 0),
  })),
});

const toCustomerProfitSaleEntry = (r: any): CustomerProfitSaleEntry => ({
  id: r.id,
  date: r.entry_date,
  product: r.product ?? "",
  quantity: Number(r.quantity ?? 0),
  amount: Number(r.amount ?? 0),
});

const toCustomerProfitSaleItem = (r: any): CustomerSaleItem => ({
  id: r.id,
  transactionId: r.transaction_id,
  productId: r.product_id ?? undefined,
  productVariantId: r.product_variant_id ?? undefined,
  product: r.product ?? "",
  quantity: Number(r.quantity ?? 0),
  unit: r.unit ?? "unit",
  rate: Number(r.rate ?? 0),
  amount: Number(r.amount ?? 0),
  purchaseCost: r.purchase_cost == null ? undefined : Number(r.purchase_cost),
  adminPriceInc: r.admin_price_inc == null ? undefined : Number(r.admin_price_inc),
  date: r.customer_transactions?.entry_date ?? r.entry_date ?? r.date ?? undefined,
});

export type CustomerProfitData = {
  orders: CustomerProfitOrder[];
  saleEntries: CustomerProfitSaleEntry[];
  saleItems: CustomerSaleItem[];
};

export async function loadCustomerProfitData(customerId: string): Promise<CustomerProfitData> {
  const [saleEntries, saleItems, orders] = await Promise.all([
    supabase
      .from("customer_transactions")
      .select(CUSTOMER_PROFIT_SALE_SELECT)
      .eq("customer_id", customerId)
      .eq("entry_type", "sale")
      .order("entry_date")
      .order("id"),

    supabase
      .from("customer_transaction_items")
      .select(CUSTOMER_PROFIT_ITEM_SELECT)
      .eq("customer_transactions.customer_id", customerId)
      .eq("customer_transactions.entry_type", "sale")
      .order("created_at"),

    supabase
      .from("orders")
      .select(CUSTOMER_PROFIT_ORDER_SELECT)
      .eq("customer_id", customerId)
      .order("placed_on"),
  ]);

  const result = [saleEntries, saleItems, orders].find((query) => query.error);
  if (result?.error) throw result.error;

  return {
    orders: (orders.data ?? []).map(toCustomerProfitOrder),
    saleEntries: (saleEntries.data ?? []).map(toCustomerProfitSaleEntry),
    saleItems: (saleItems.data ?? []).map(toCustomerProfitSaleItem),
  };
}
