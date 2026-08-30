import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
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
import { EmptyState } from "@/components/admin/EmptyState";
import { DetailHeader } from "@/components/shared/DetailHeader";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { Timeline } from "@/components/shared/Timeline";
import { TablePagination } from "@/components/shared/TablePagination";
import { KhataSaleDialog } from "@/components/khata/KhataSaleDialog";
import { RecordPaymentDialog } from "@/components/khata/RecordPaymentDialog";
import { formatCurrency, formatDate, useShopStore } from "@/lib/shop-store";
import { CUSTOMER_KHATA_PAGE_SIZE, loadCustomerKhataPage } from "@/lib/admin-customer-data";
import type { CustomerLedgerEntry } from "@/types/business";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [ledger, setLedger] = useState<CustomerLedgerEntry[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLedgerLoading(true);

    void loadCustomerKhataPage(customerId, page, CUSTOMER_KHATA_PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setLedger(result.rows);
        setPageCount(result.pageCount);
        setTotalTransactions(result.total);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Customer khata load failed:", error);
        setLedger([]);
        setPageCount(1);
        setTotalTransactions(0);
      })
      .finally(() => {
        if (!cancelled) setLedgerLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, page]);

  const totals = useMemo(
    () => ({
      purchase: customer?.totalPurchases ?? 0,
      paid: customer?.totalPaid ?? 0,
    }),
    [customer],
  );

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
          { label: "Transactions", value: String(totalTransactions), icon: BookOpen },
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
                    {ledgerLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                          Loading ledger…
                        </TableCell>
                      </TableRow>
                    ) : ledger.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                          No ledger entries found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledger.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-muted-foreground">
                            {formatDate(entry.date)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.entryType === "purchase" ? (
                              <Button asChild variant="outline" size="sm" className="rounded-full">
                                <Link
                                  to="/admin/customers/$customerId"
                                  params={{ customerId }}
                                >
                                  <BookOpen className="size-3.5" /> View full record
                                </Link>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">Payment received</span>
                            )}
                          </TableCell>
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {!ledgerLoading && (
                <TablePagination
                  page={page}
                  pageCount={pageCount}
                  total={totalTransactions}
                  onPageChange={setPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <Card className="shadow-soft">
            <CardContent className="pt-6">
              <Timeline
                items={ledger.map((entry) => ({
                  id: entry.id,
                  title: entry.product || "Payment received",
                  meta: `${formatDate(entry.date)} · ${entry.method.toUpperCase()}`,
                  description: `Paid ${formatCurrency(entry.payment)} · Due ${formatCurrency(entry.remainingDue)}`,
                  amount: formatCurrency(entry.amount),
                  tone: entry.remainingDue > 0 ? "warning" : "success",
                }))}
              />
              {!ledgerLoading && pageCount > 1 ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  Timeline shows the current ledger page. Use Table view for pagination.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
