import { useMemo, useState } from "react";
import { Fragment } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  IndianRupee,
  Printer,
  Receipt,
  ShoppingCart,
  UserX,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { DetailHeader } from "@/components/shared/DetailHeader";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { Timeline } from "@/components/shared/Timeline";
import { KhataSaleDialog } from "@/components/khata/KhataSaleDialog";
import { RecordPaymentDialog } from "@/components/khata/RecordPaymentDialog";
import { formatCurrency, formatDate, shopStore, useShopStore } from "@/lib/shop-store";
import type { CustomerSaleItem } from "@/types/business";

export const Route = createFileRoute("/admin/khata/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer Khata — Admin" },
      { name: "description", content: "Complete farmer ledger with purchases, payments and dues." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomerKhataPage,
});

function CustomerKhataPage() {
  const { customerId } = Route.useParams();
  const customer = useShopStore((s) => s.customers.find((c) => c.id === customerId));
  const ledger = useShopStore((s) => s.customerLedger.filter((e) => e.customerId === customerId));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [itemsByTx, setItemsByTx] = useState<Record<string, CustomerSaleItem[] | "loading">>({});

  const sorted = useMemo(() => [...ledger].sort((a, b) => b.date.localeCompare(a.date)), [ledger]);
  const totals = useMemo(
    () => ({
      purchase: ledger.reduce((sum, e) => sum + e.amount, 0),
      paid: ledger.reduce((sum, e) => sum + e.payment, 0),
    }),
    [ledger],
  );

  const toggleExpand = async (entryId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
    if (!itemsByTx[entryId]) {
      setItemsByTx((prev) => ({ ...prev, [entryId]: "loading" }));
      try {
        const items = await shopStore.fetchTransactionItems(entryId);
        setItemsByTx((prev) => ({ ...prev, [entryId]: items }));
      } catch {
        setItemsByTx((prev) => ({ ...prev, [entryId]: [] }));
      }
    }
  };

  if (!customer) {
    return (
      <EmptyState
        icon={UserX}
        title="Khata not found"
        description="This customer no longer exists. Return to the customer list."
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
          { label: customer.name, to: "/admin/customers" },
          { label: "Khata" },
        ]}
        title={`${customer.name} — Khata`}
        subtitle={`${customer.village} · ${customer.mobile}`}
        actions={
          <>
            <RecordPaymentDialog
              customer={{ id: customer.id, name: customer.name, currentDue: customer.currentDue }}
              trigger={
                <Button variant="outline" className="rounded-full">
                  <Wallet className="size-4" /> Record payment
                </Button>
              }
            />
            <KhataSaleDialog
              customer={{ id: customer.id, name: customer.name }}
              trigger={
                <Button className="rounded-full">
                  <ShoppingCart className="size-4" /> New sale
                </Button>
              }
            />
            <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button variant="outline" className="rounded-full" disabled>
              <Download className="size-4" /> Export (soon)
            </Button>
          </>
        }
      />

      <SummaryCards
        items={[
          { label: "Total purchase", value: formatCurrency(totals.purchase), icon: IndianRupee },
          {
            label: "Total paid",
            value: formatCurrency(totals.paid),
            icon: Wallet,
            tone: "success",
          },
          {
            label: "Current due",
            value: formatCurrency(customer.currentDue),
            icon: Receipt,
            tone: customer.currentDue > 0 ? "warning" : "success",
          },
          { label: "Transactions", value: String(ledger.length), icon: BookOpen },
        ]}
      />

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table view</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="table" className="mt-4">
          <Card className="overflow-hidden shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Ledger entries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Payment</TableHead>
                      <TableHead className="text-right">Remaining due</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((entry) => {
                      const canExpand = entry.entryType === "purchase";
                      const isOpen = expanded.has(entry.id);
                      const items = itemsByTx[entry.id];
                      return (
                        <Fragment key={entry.id}>
                          <TableRow>
                            <TableCell>
                              {canExpand && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(entry.id)}
                                  className="text-muted-foreground hover:text-foreground"
                                  aria-label="Toggle items"
                                >
                                  {isOpen ? (
                                    <ChevronDown className="size-4" />
                                  ) : (
                                    <ChevronRight className="size-4" />
                                  )}
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(entry.date)}
                            </TableCell>
                            <TableCell className="font-medium">{entry.product}</TableCell>
                            <TableCell className="text-right">{entry.quantity}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(entry.amount)}
                            </TableCell>
                            <TableCell className="text-right text-success">
                              {formatCurrency(entry.payment)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(entry.remainingDue)}
                            </TableCell>
                            <TableCell className="uppercase text-muted-foreground">
                              {entry.method}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {entry.remarks ?? "—"}
                            </TableCell>
                          </TableRow>
                          {canExpand && isOpen && (
                            <TableRow>
                              <TableCell />
                              <TableCell colSpan={8} className="bg-muted/40 py-3">
                                {items === "loading" || items === undefined ? (
                                  <p className="text-sm text-muted-foreground">Loading items…</p>
                                ) : items.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    No line items recorded for this entry.
                                  </p>
                                ) : (
                                  <div className="space-y-1">
                                    {items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center justify-between text-sm"
                                      >
                                        <span>
                                          {item.product}{" "}
                                          <span className="text-muted-foreground">
                                            ({item.quantity} {item.unit} ×{" "}
                                            {formatCurrency(item.rate)})
                                          </span>
                                        </span>
                                        <span className="font-medium">
                                          {formatCurrency(item.amount)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <Card className="shadow-soft">
            <CardContent className="pt-6">
              <Timeline
                items={sorted.map((entry) => ({
                  id: entry.id,
                  title: entry.product,
                  meta: `${formatDate(entry.date)} · ${entry.method.toUpperCase()}`,
                  description: `Paid ${formatCurrency(entry.payment)} · Due ${formatCurrency(entry.remainingDue)}`,
                  amount: formatCurrency(entry.amount),
                  tone: entry.remainingDue > 0 ? "warning" : "success",
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
