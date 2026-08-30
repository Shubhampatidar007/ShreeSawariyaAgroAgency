import { supabase } from "@/integrations/supabase/client";
import type { CustomerLedgerEntry } from "@/types/business";

export const CUSTOMER_KHATA_PAGE_SIZE = 20;

const toCustomerLedger = (r: any): CustomerLedgerEntry => ({
  id: r.id,
  customerId: r.customer_id,
  date: r.entry_date,
  entryType: r.entry_type,
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
