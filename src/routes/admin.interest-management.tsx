import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  IndianRupee,
  Loader2,
  Plus,
  Search,
  Send,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { TablePagination } from "@/components/shared/TablePagination";
import { extractErrorMessage } from "@/lib/error-extract";
import { shopStore, useShopStore, formatCurrency, formatDate } from "@/lib/shop-store";
import type { InterestAgreement } from "@/types/business";

export const Route = createFileRoute("/admin/interest-management")({
  head: () => ({
    meta: [
      { title: "Interest Management — Admin" },
      {
        name: "description",
        content: "Central management of interest agreements and direct customer loans.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InterestManagementPage,
});

type PaymentMethod = "cash" | "upi" | "bank" | "cheque";

function InterestManagementPage() {
  const customers = useShopStore((s) => s.customers);
  const [tab, setTab] = useState("active");

  // ===== Active Agreements tab state =====
  const [search, setSearch] = useState("");
  const [village, setVillage] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [activeAgreements, setActiveAgreements] = useState<InterestAgreement[]>([]);
  const [loadingActive, setLoadingActive] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  const villages = useMemo(
    () => Array.from(new Set(customers.map((c) => c.village).filter(Boolean))).sort(),
    [customers],
  );

  const loadActive = useCallback(async () => {
    setLoadingActive(true);
    setActiveError(null);
    try {
      const result = await shopStore.loadActiveInterestAgreements({
        search: search.trim() || undefined,
        village: village || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        pageSize: 25,
      });
      setActiveAgreements(result);
    } catch (err) {
      setActiveError(extractErrorMessage(err, "Failed to load active agreements"));
      setActiveAgreements([]);
    } finally {
      setLoadingActive(false);
    }
  }, [search, village, dateFrom, dateTo, page]);

  useEffect(() => {
    void loadActive();
  }, [loadActive]);

  // The load_active_interest_agreements RPC returns a total_count column
  // (added in migration 20261016190000). Each row carries the same total.
  // If the migration hasn't been applied yet (older DB), fall back to
  // activeAgreements.length so pagination at least doesn't crash.
  const totalCount =
    activeAgreements.length > 0
      ? Number(activeAgreements[0].totalCount ?? activeAgreements.length)
      : 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / 25));

  // ===== Give Money / Direct Loan tab state =====
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanCustomerId, setLoanCustomerId] = useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [principal, setPrincipal] = useState("");
  const [disbursementDate, setDisbursementDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [interestRate, setInterestRate] = useState("");
  const [ratePeriod, setRatePeriod] = useState<"monthly" | "annual">("annual");
  const [interestStartDate, setInterestStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Customer picker
  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 50);
    return customers
      .filter((c) => `${c.name} ${c.mobile} ${c.village}`.toLowerCase().includes(q))
      .slice(0, 50);
  }, [customers, customerQuery]);

  function resetLoanForm() {
    setLoanCustomerId(null);
    setCustomerQuery("");
    setPrincipal("");
    setDisbursementDate(new Date().toISOString().slice(0, 10));
    setInterestRate("");
    setRatePeriod("annual");
    setInterestStartDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("cash");
    setPaymentReference("");
    setNotes("");
  }

  async function submitLoan() {
    if (!loanCustomerId) {
      toast.error("Select a customer");
      return;
    }
    const principalNum = Number(principal);
    if (!principalNum || principalNum <= 0) {
      toast.error("Enter a valid principal");
      return;
    }
    const rateNum = Number(interestRate);
    if (!rateNum || rateNum < 0) {
      toast.error("Enter a valid interest rate");
      return;
    }
    setSaving(true);
    try {
      await shopStore.createDirectLoan({
        customerId: loanCustomerId,
        principal: principalNum,
        disbursementDate,
        interestRate: rateNum,
        ratePeriod,
        interestStartDate,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        notes: notes.trim() || undefined,
        idempotencyKey: `direct-loan-${Date.now()}-${loanCustomerId}`,
      });
      toast.success("Direct loan recorded");
      setLoanOpen(false);
      resetLoanForm();
      // Refresh active agreements so the new loan appears.
      void loadActive();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to record loan"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Interest Management" }]}
        eyebrow="Finance"
        title="Interest Management"
        description="Central management of interest-bearing sale balances and direct customer loans."
        actions={
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => {
              resetLoanForm();
              setLoanOpen(true);
            }}
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Give Money / Direct Loan</span>
            <span className="sm:hidden">New Loan</span>
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-3">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl p-1">
          <TabsTrigger value="active" className="rounded-lg py-2 text-xs sm:text-sm">
            <TrendingUp className="mr-2 size-3.5" />
            Active Agreements
          </TabsTrigger>
          <TabsTrigger value="give" className="rounded-lg py-2 text-xs sm:text-sm">
            <Wallet className="mr-2 size-3.5" />
            Give Money
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* Active Agreements tab                                         */}
        {/* ============================================================ */}
        <TabsContent value="active" className="space-y-3">
          <Card className="shadow-soft">
            <CardHeader className="py-3 sm:py-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="relative col-span-2 sm:col-span-2">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    className="h-9 pl-8 text-sm"
                    placeholder="Search customer or mobile"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <Select
                  value={village}
                  onValueChange={(v) => {
                    setVillage(v === "all" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All villages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All villages</SelectItem>
                    {villages.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {activeError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive sm:text-sm">
                  {activeError}
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-2 rounded-full"
                    onClick={() => void loadActive()}
                  >
                    Retry
                  </Button>
                </div>
              ) : loadingActive ? (
                <p className="py-6 text-center text-xs text-muted-foreground sm:text-sm">
                  Loading active agreements…
                </p>
              ) : activeAgreements.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground sm:text-sm">
                  No active interest agreements. Use "Give Money / Direct Loan" to create one, or
                  attach interest to a New Khata Sale.
                </p>
              ) : (
                <>
                  {/* Desktop: table */}
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="py-2 pr-3">Customer</th>
                          <th className="py-2 pr-3">Type</th>
                          <th className="py-2 pr-3 text-right">Principal</th>
                          <th className="py-2 pr-3 text-right">Interest due</th>
                          <th className="py-2 pr-3 text-right">Total settlement</th>
                          <th className="py-2 pr-3">Rate</th>
                          <th className="py-2 pr-3">Start date</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeAgreements.map((a) => {
                          // Look up the customer name from the local cache.
                          const customer = customers.find((c) => c.id === a.customerId);
                          return (
                            <tr key={a.id} className="border-b last:border-0">
                              <td className="py-2 pr-3">
                                <Link
                                  to="/admin/khata/customers/$customerId"
                                  params={{ customerId: a.customerId }}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {customer?.name ?? "View Khata"}
                                </Link>
                                {customer ? (
                                  <p className="text-[10px] text-muted-foreground">
                                    {customer.mobile} · {customer.village || "—"}
                                  </p>
                                ) : null}
                              </td>
                              <td className="py-2 pr-3">
                                <Badge
                                  variant="outline"
                                  className="rounded-full px-2 py-0.5 text-[10px]"
                                >
                                  {a.agreementType === "loan" ? "Loan" : "Sale"}
                                </Badge>
                              </td>
                              <td className="py-2 pr-3 text-right">
                                {formatCurrency(a.originalPrincipal)}
                              </td>
                              <td className="py-2 pr-3 text-right text-warning">
                                {formatCurrency(a.interestOutstanding ?? 0)}
                              </td>
                              <td className="py-2 pr-3 text-right font-semibold text-primary">
                                {formatCurrency(a.totalSettlement ?? 0)}
                              </td>
                              <td className="py-2 pr-3 text-xs">
                                {a.interestRate}% {a.ratePeriod}
                              </td>
                              <td className="py-2 pr-3 text-xs">
                                {formatDate(a.interestStartDate)}
                              </td>
                              <td className="py-2 pr-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.status === "paused" ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary"}`}
                                >
                                  {a.status}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-right">
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-7 rounded-full px-2.5 text-[11px]"
                                >
                                  <Link
                                    to="/admin/khata/customers/$customerId"
                                    params={{ customerId: a.customerId }}
                                  >
                                    Khata
                                  </Link>
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: compact cards */}
                  <ul className="space-y-2 sm:hidden">
                    {activeAgreements.map((a) => (
                      <li key={a.id} className="rounded-lg border p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Badge
                              variant="outline"
                              className="rounded-full px-2 py-0.5 text-[10px]"
                            >
                              {a.agreementType === "loan" ? "Loan" : "Sale"}
                            </Badge>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {a.interestRate}% {a.ratePeriod} · {formatDate(a.interestStartDate)}
                            </p>
                          </div>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 shrink-0 rounded-full px-2.5 text-[11px]"
                          >
                            <Link
                              to="/admin/khata/customers/$customerId"
                              params={{ customerId: a.customerId }}
                            >
                              Khata
                            </Link>
                          </Button>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs">
                          <div className="rounded bg-muted/50 px-2 py-1">
                            <p className="text-[9px] uppercase text-muted-foreground">Principal</p>
                            <p className="mt-0.5 font-semibold">
                              {formatCurrency(a.originalPrincipal)}
                            </p>
                          </div>
                          <div className="rounded bg-muted/50 px-2 py-1">
                            <p className="text-[9px] uppercase text-muted-foreground">Interest</p>
                            <p className="mt-0.5 font-semibold text-warning">
                              {formatCurrency(a.interestOutstanding ?? 0)}
                            </p>
                          </div>
                          <div className="rounded bg-muted/50 px-2 py-1">
                            <p className="text-[9px] uppercase text-muted-foreground">Settlement</p>
                            <p className="mt-0.5 font-semibold text-primary">
                              {formatCurrency(a.totalSettlement ?? 0)}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <TablePagination
                    page={page}
                    pageCount={pageCount}
                    total={totalCount}
                    onPageChange={setPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* Give Money tab — opens the loan dialog                        */}
        {/* ============================================================ */}
        <TabsContent value="give" className="space-y-3">
          <Card className="shadow-soft">
            <CardHeader className="py-3 sm:py-4">
              <CardTitle className="text-sm sm:text-base">Give Money / Direct Loan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-xs text-muted-foreground sm:text-sm">
                Record money handed to a customer as a separate loan with simple interest. Direct
                loans do NOT create product sales, alter inventory, or inflate sales revenue.
              </p>
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => {
                  resetLoanForm();
                  setLoanOpen(true);
                }}
              >
                <Plus className="size-3.5" />
                Record new direct loan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/* Direct Loan Dialog                                            */}
      {/* ============================================================ */}
      <Dialog open={loanOpen} onOpenChange={setLoanOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Direct Loan</DialogTitle>
            <DialogDescription>
              Money handed to a customer. Creates a separate loan record, an interest agreement, and
              a ledger entry — but does not affect inventory or sales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Customer picker */}
            <div className="space-y-1.5">
              <Label className="text-xs">Customer</Label>
              <Input
                className="h-9 text-sm"
                placeholder="Search customer by name, mobile, or village"
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setLoanCustomerId(null);
                }}
              />
              {filteredCustomers.length > 0 ? (
                <div className="max-h-32 overflow-y-auto rounded-md border">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setLoanCustomerId(c.id);
                        setCustomerQuery(`${c.name} · ${c.mobile} · ${c.village}`);
                      }}
                      className={`block w-full px-2.5 py-1.5 text-left text-xs hover:bg-muted/40 ${loanCustomerId === c.id ? "bg-primary/10 font-medium" : ""}`}
                    >
                      {c.name} · {c.mobile} · {c.village || "—"}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No match.{" "}
                  <Link to="/admin/customers/new" className="text-primary underline">
                    Create new customer
                  </Link>{" "}
                  first.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Principal disbursed (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-9 text-sm"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Disbursement date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={disbursementDate}
                  onChange={(e) => setDisbursementDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Interest rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-9 text-sm"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rate period</Label>
                <Select
                  value={ratePeriod}
                  onValueChange={(v) => setRatePeriod(v as "monthly" | "annual")}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Interest start date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={interestStartDate}
                  onChange={(e) => setInterestStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reference (optional)</Label>
              <Input
                className="h-9 text-sm"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="UTR, cheque no."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                rows={2}
                className="text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setLoanOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size="sm" className="rounded-full" onClick={submitLoan} disabled={saving}>
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Record loan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
