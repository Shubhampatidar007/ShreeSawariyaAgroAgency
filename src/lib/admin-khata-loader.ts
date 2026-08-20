/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase row shapes are inferred at runtime by the generated client. */
import { supabase } from "@/integrations/supabase/client";
import type { Customer, CustomerLedgerEntry } from "@/types/business";

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

export async function loadCustomerKhataFeature(customerId: string) {
  const [customer, ledger] = await Promise.all([
    supabase.from("customers").select("*").eq("id", customerId).maybeSingle(),
    supabase
      .from("customer_transactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("entry_date", { ascending: false }),
  ]);

  if (customer.error) throw customer.error;
  if (ledger.error) throw ledger.error;

  return {
    customers: customer.data ? [toCustomer(customer.data)] : [],
    customerLedger: (ledger.data ?? []).map(toCustomerLedger),
  };
}
