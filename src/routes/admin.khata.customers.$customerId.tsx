import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Download,
  IndianRupee,
  Printer,
  Receipt,
  ShoppingCart,
  RotateCcw,
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
import { KhataReturnDialog } from "@/components/khata/KhataReturnDialog";
import { InterestAgreementPanel } from "@/components/interest/InterestAgreementPanel";
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
  const [ledgerRefreshKey, setLedgerRefreshKey] = useState(0);

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
  }, [customerId, page, ledgerRefreshKey]);

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
    <div className="space-y-4 sm:space-y-6">
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
                <Button variant="outline" size="sm" className="rounded-full">
                  <Wallet className="size-3.5" /> Payment
                </Button>
              }
            />
            <KhataReturnDialog
              customer={{ id: customer.id, name: customer.name, currentDue: customer.currentDue }}
              onCreated={() => setLedgerRefreshKey((value) => value + 1)}
              trigger={
                <Button variant="outline" size="sm" className="rounded-full">
                  <RotateCcw className="size-3.5" /> Return
                </Button>
              }
            />
            <KhataSaleDialog
              customer={{ id: customer.id, name: customer.name }}
              trigger={
                <Button size="sm" className="rounded-full">
                  <ShoppingCart className="size-3.5" /> New sale
                </Button>
              }
            />
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => window.print()}
            >
              <Printer className="size-3.5" /> Print
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" disabled>
              <Download className="size-3.5" /> Export
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

      {/* Phase 3: Interest Agreements panel — only renders if the customer has agreements. */}
      <InterestAgreementPanel customerId={customer.id} />

      <Tabs defaultValue="table">
        <TabsList className="grid w-full max-w-xs grid-cols-2 rounded-xl p-1 sm:max-w-sm">
          <TabsTrigger value="table" className="rounded-lg py-2 text-xs sm:text-sm">
            List view
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-lg py-2 text-xs sm:text-sm">
            Timeline
          </TabsTrigger>
        </TabsList>
        <TabsContent value="table" className="mt-3 sm:mt-4">
          <Card className="overflow-hidden shadow-soft">
            <CardHeader className="py-3 sm:py-4">
              <CardTitle className="text-sm sm:text-base">Ledger entries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ledgerLoading ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading ledger…
                </p>
              ) : ledger.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No ledger entries found.
                </p>
              ) : (
                <>
                  {/* Mobile: compact card list (no horizontal scroll). */}
                  <ul className="space-y-2 p-3 sm:hidden">
                    {ledger.map((entry) => (
                      <li key={entry.id} className="rounded-lg border p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                              {formatDate(entry.date)}
                            </p>
                            <p className="mt-0.5 text-sm font-semibold">
                              {entry.entryType === "purchase"
                                ? entry.product || "Purchase"
                                : "Payment received"}
                            </p>
                            <p className="mt-0.5 text-[11px] uppercase text-muted-foreground">
                              {entry.method}
                              {entry.remarks ? ` · ${entry.remarks}` : ""}
                            </p>
                          </div>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 shrink-0 rounded-full px-2.5 text-[11px]"
                          >
                            <Link to="/admin/customers/$customerId" params={{ customerId }}>
                              <BookOpen className="size-3" />
                              View
                            </Link>
                          </Button>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs">
                          <div className="rounded bg-muted/50 px-2 py-1">
                            <p className="text-[9px] uppercase text-muted-foreground">Qty</p>
                            <p className="mt-0.5 font-semibold">{entry.quantity}</p>
                          </div>
                          <div className="rounded bg-muted/50 px-2 py-1">
                            <p className="text-[9px] uppercase text-muted-foreground">Amount</p>
                            <p className="mt-0.5 font-semibold">{formatCurrency(entry.amount)}</p>
                          </div>
                          <div className="rounded bg-muted/50 px-2 py-1">
                            <p className="text-[9px] uppercase text-muted-foreground">Paid</p>
                            <p className="mt-0.5 font-semibold text-success">
                              {formatCurrency(entry.payment)}
                            </p>
                          </div>
                          <div className="col-span-3 rounded bg-muted/50 px-2 py-1">
                            <p className="text-[9px] uppercase text-muted-foreground">
                              Remaining due
                            </p>
                            <p className="mt-0.5 font-semibold">
                              {formatCurrency(entry.remainingDue)}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Desktop: original table. */}
                  <div className="hidden overflow-x-auto sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Payment</TableHead>
                          <TableHead className="text-right">Remaining due</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledger.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-muted-foreground">
                              {formatDate(entry.date)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {entry.entryType === "purchase" ? (
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full"
                                >
                                  <Link to="/admin/customers/$customerId" params={{ customerId }}>
                                    <BookOpen className="size-3.5" />
                                    View full record
                                  </Link>
                                </Button>
                              ) : (
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full"
                                >
                                  <Link to="/admin/customers/$customerId" params={{ customerId }}>
                                    <BookOpen className="size-3.5" />
                                    View customer
                                  </Link>
                                </Button>
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
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
        <TabsContent value="timeline" className="mt-3 sm:mt-4">
          <Card className="shadow-soft">
            <CardContent className="pt-4 sm:pt-6">
              <Timeline
                items={ledger.map((entry) => ({
                  id: entry.id,
                  title:
                    entry.entryType === "payment"
                      ? "Payment received"
                      : entry.product || "Transaction",
                  meta: `${formatDate(entry.date)} · ${entry.method.toUpperCase()}`,
                  description: `Paid ${formatCurrency(entry.payment)} · Due ${formatCurrency(entry.remainingDue)}`,
                  amount: formatCurrency(
                    entry.entryType === "payment" ? entry.payment : entry.amount,
                  ),
                  tone: entry.remainingDue > 0 ? "warning" : "success",
                }))}
              />
              {!ledgerLoading && pageCount > 1 ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  Timeline shows the current ledger page. Use List view for pagination.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
