import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  IndianRupee,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  UserX,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/admin/EmptyState";
import { DetailHeader } from "@/components/shared/DetailHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { formatCurrency, formatDate, shopStore, useShopStore } from "@/lib/shop-store";
import { loadCustomerLedger } from "@/lib/admin-customer-data";
import type { CustomerLedgerEntry, CustomerSaleItem } from "@/types/business";

export const Route = createFileRoute("/admin/customers/$customerId/")({
  head: () => ({
    meta: [
      { title: "Customer Profile — Admin" },
      {
        name: "description",
        content: "Farmer profile with purchases, payments and khata summary.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const customer = useShopStore((s) => s.customers.find((c) => c.id === customerId));
  const [ledger, setLedger] = useState<CustomerLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [itemsByTx, setItemsByTx] = useState<Record<string, CustomerSaleItem[] | "loading">>({});

  useEffect(() => {
    let cancelled = false;
    setLedgerLoading(true);
    setExpandedDates(new Set());
    setItemsByTx({});

    void loadCustomerLedger(customerId)
      .then((rows) => {
        if (!cancelled) setLedger(rows);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Customer ledger load failed:", error);
        setLedger([]);
      })
      .finally(() => {
        if (!cancelled) setLedgerLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const sorted = useMemo(() => {
    return ledger
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => {
        const dateOrder = b.entry.date.localeCompare(a.entry.date);
        return dateOrder !== 0 ? dateOrder : b.index - a.index;
      })
      .map(({ entry }) => entry);
  }, [ledger]);

  const dateGroups = useMemo(() => {
    const groups = new Map<string, CustomerLedgerEntry[]>();
    for (const entry of sorted) {
      const group = groups.get(entry.date) ?? [];
      group.push(entry);
      groups.set(entry.date, group);
    }
    return Array.from(groups, ([date, entries]) => ({ date, entries }));
  }, [sorted]);

  const toggleDate = async (date: string, entries: CustomerLedgerEntry[]) => {
    const willOpen = !expandedDates.has(date);
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (willOpen) next.add(date);
      else next.delete(date);
      return next;
    });

    if (!willOpen) return;

    const purchases = entries.filter((entry) => entry.entryType === "purchase");
    const pending = purchases.filter((entry) => !itemsByTx[entry.id]);
    if (!pending.length) return;

    setItemsByTx((prev) => {
      const next = { ...prev };
      for (const entry of pending) next[entry.id] = "loading";
      return next;
    });

    const results = await Promise.all(
      pending.map(async (entry) => {
        try {
          return [entry.id, await shopStore.fetchTransactionItems(entry.id)] as const;
        } catch (error) {
          console.error("Customer transaction items load failed:", error);
          return [entry.id, []] as const;
        }
      }),
    );

    setItemsByTx((prev) => {
      const next = { ...prev };
      for (const [entryId, items] of results) next[entryId] = items;
      return next;
    });
  };

  if (!customer) {
    return (
      <EmptyState
        icon={UserX}
        title="Customer not found"
        description="This customer may have been deleted. Return to the customer list to continue."
        action={
          <Button className="rounded-full" asChild>
            <Link to="/admin/customers">Back to customers</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <DetailHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Customers", to: "/admin/customers" },
          { label: customer.name },
        ]}
        title={customer.name}
        subtitle={`${customer.village} · Customer since ${formatDate(customer.joinedOn)}`}
        badge={<StatusBadge status={customer.status} />}
        avatar={
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary/10 text-primary">
              {customer.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        }
        actions={
          <>
            <Button variant="outline" className="rounded-full" asChild>
              <Link to="/admin/customers/$customerId/edit" params={{ customerId }}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
            <Button className="rounded-full" asChild>
              <Link to="/admin/khata/customers/$customerId" params={{ customerId }}>
                <BookOpen className="size-4" /> Open khata
              </Link>
            </Button>
          </>
        }
      />

      <SummaryCards
        items={[
          { label: "Total purchases", value: formatCurrency(customer.totalPurchases), icon: IndianRupee },
          { label: "Total paid", value: formatCurrency(customer.totalPaid), icon: Wallet, tone: "success" },
          {
            label: "Current due",
            value: formatCurrency(customer.currentDue),
            icon: Receipt,
            tone: customer.currentDue > 0 ? "warning" : "success",
          },
          { label: "Transactions", value: String(ledger.length), icon: BookOpen, helper: "Khata entries" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Personal information</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <InfoRow icon={Phone} label="Mobile" value={customer.mobile} />
            <Separator />
            <InfoRow icon={MapPin} label="Address" value={customer.address} />
            <Separator />
            <InfoRow icon={BookOpen} label="Village" value={customer.village} />
            {customer.notes ? <><Separator /><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p><p className="mt-1 text-sm">{customer.notes}</p></div></> : null}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Transaction timeline</CardTitle></CardHeader>
          <CardContent>
            {ledgerLoading ? (
              <p className="text-sm text-muted-foreground">Loading transaction history…</p>
            ) : dateGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No khata entries recorded yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-border pl-6">
                {dateGroups.map(({ date, entries }) => {
                  const isOpen = expandedDates.has(date);
                  const dayAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);

                  return (
                    <li key={date} className="relative">
                      <span className="absolute -left-[27px] top-2 size-3 rounded-full bg-primary ring-4 ring-background" />
                      <div className="rounded-xl border border-border bg-background/40 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{formatDate(date)}</p>
                            <p className="text-xs text-muted-foreground">
                              {entries.length} transaction{entries.length === 1 ? "" : "s"} · {formatCurrency(dayAmount)}
                            </p>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => void toggleDate(date, entries)} aria-expanded={isOpen}>
                            {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />} View details
                          </Button>
                        </div>

                        {isOpen ? (
                          <div className="mt-3 space-y-3 border-t border-border pt-3">
                            {entries.map((entry) => {
                              const items = itemsByTx[entry.id];
                              const displayAmount = entry.entryType === "payment" ? entry.payment : entry.amount;

                              return (
                                <div key={entry.id} className="rounded-lg bg-muted/40 p-3">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium">
                                        {entry.entryType === "purchase" ? "Purchase" : entry.entryType === "payment" ? "Payment received" : "Transaction"}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {entry.quantity} unit{entry.quantity === 1 ? "" : "s"} · {entry.method.toUpperCase()}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        Paid {formatCurrency(entry.payment)} · Due {formatCurrency(entry.remainingDue)}
                                      </p>
                                      {entry.remarks ? <p className="mt-1 text-xs text-muted-foreground">{entry.remarks}</p> : null}
                                    </div>
                                    <p className="shrink-0 font-display text-sm font-semibold">{formatCurrency(displayAmount)}</p>
                                  </div>

                                  {entry.entryType === "purchase" ? (
                                    <div className="mt-3 border-t border-border/70 pt-3">
                                      {items === "loading" || items === undefined ? (
                                        <p className="text-xs text-muted-foreground">Loading product details…</p>
                                      ) : items.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">No product line items recorded for this transaction.</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {items.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between gap-4 rounded-md border border-border/60 px-3 py-2 text-xs">
                                              <div className="min-w-0">
                                                <p className="font-medium">{item.product}</p>
                                                <p className="text-muted-foreground">Quantity: {item.quantity} {item.unit}</p>
                                                <p className="text-muted-foreground">Rate: {formatCurrency(item.rate)} / {item.unit}</p>
                                              </div>
                                              <div className="shrink-0 text-right"><p className="font-semibold">{formatCurrency(item.amount)}</p></div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
      <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div>
    </div>
  );
}
