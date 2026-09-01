import { useMemo, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, CreditCard, Wallet } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, shopStore, useShopStore } from "@/lib/shop-store";
import type { SupplierLedgerEntry } from "@/types/business";

type SupplierTimelineEntry = SupplierLedgerEntry & {
  productName?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
};

type Props = { entries: SupplierLedgerEntry[] };

const formatTimelineDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const today = () => new Date().toISOString().slice(0, 10);

export function SupplierTransactionTimeline({ entries }: Props) {
  const location = useLocation();
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "bank" | "cheque">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const suppliers = useShopStore((state) => state.suppliers);
  const supplierId = entries[0]?.supplierId ?? location.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const supplier = suppliers.find((item) => item.id === supplierId);

  const groups = useMemo(() => {
    const byDate = new Map<string, SupplierLedgerEntry[]>();
    for (const entry of entries) {
      const group = byDate.get(entry.date) ?? [];
      group.push(entry);
      byDate.set(entry.date, group);
    }

    return Array.from(byDate, ([date, dayEntries]) => {
      const purchases = dayEntries.filter((entry) => entry.entryType === "purchase");
      const advances = dayEntries.filter((entry) => entry.entryType === "advance");
      const payments = dayEntries.filter((entry) => entry.entryType === "payment");
      const purchaseTotal = purchases.reduce((sum, entry) => sum + entry.amount, 0);
      const paidTotal =
        advances.reduce((sum, entry) => sum + entry.amount, 0) +
        payments.reduce((sum, entry) => sum + entry.amount, 0);

      return {
        date,
        purchases,
        advances,
        payments,
        purchaseTotal,
        paidTotal,
        due: dayEntries[dayEntries.length - 1]?.balance ?? 0,
      };
    });
  }, [entries]);

  const payments = useMemo(
    () => [...entries]
      .filter((entry) => entry.entryType === "payment")
      .sort((a, b) => b.date.localeCompare(a.date)),
    [entries],
  );

  const toggleDate = (date: string) => {
    setExpandedDates((current) => {
      const next = new Set(current);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const openPayment = () => {
    if (!supplier) {
      toast.error("Supplier details could not be loaded.");
      return;
    }
    setPaymentError("");
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentRemarks("");
    setPaymentDate(today());
    setPaymentMethod("cash");
    setPaymentOpen(true);
  };

  const recordPayment = async () => {
    if (!supplier) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Enter a valid payment amount.");
      return;
    }
    if (amount > supplier.dueBalance) {
      setPaymentError(`Payment cannot exceed the current due of ${formatCurrency(supplier.dueBalance)}.`);
      return;
    }

    setPaymentSaving(true);
    setPaymentError("");
    try {
      await shopStore.recordSupplierPayment({
        supplierId: supplier.id,
        amount,
        method: paymentMethod,
        date: paymentDate,
        reference: paymentReference.trim(),
        remarks: paymentRemarks.trim(),
      });
      setPaymentOpen(false);
      toast.success("Supplier payment recorded.");
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Failed to record payment.");
    } finally {
      setPaymentSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
      <Card className="supplier-timeline-full shadow-soft">
        <CardHeader><CardTitle className="text-lg">Purchase timeline</CardTitle></CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No supplier transactions recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const isOpen = expandedDates.has(group.date);
                return (
                  <div key={group.date} className="overflow-hidden rounded-xl border bg-background">
                    <button type="button" className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/40" onClick={() => toggleDate(group.date)} aria-expanded={isOpen}>
                      <div>
                        <p className="text-base font-semibold">{formatTimelineDate(group.date)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{group.purchases.length} transaction{group.purchases.length === 1 ? "" : "s"} · {formatCurrency(group.purchaseTotal)}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        {isOpen ? "Hide details" : "View details"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t p-4">
                        <div className="space-y-2">
                          {group.purchases.map((rawEntry) => {
                            const entry = rawEntry as SupplierTimelineEntry;
                            return (
                              <div key={entry.id} className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_140px_140px_140px] sm:items-center">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">{entry.productName || entry.reference || "Purchase"}</p>
                                  {entry.remarks ? <p className="mt-1 text-xs text-muted-foreground">{entry.remarks}</p> : null}
                                </div>
                                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quantity</p><p className="text-sm font-medium">{entry.quantity != null ? `${entry.quantity} ${entry.unit ?? ""}` : "—"}</p></div>
                                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rate</p><p className="text-sm font-medium">{entry.unitPrice != null ? formatCurrency(entry.unitPrice) : "—"}</p></div>
                                <div className="sm:text-right"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Amount</p><p className="text-sm font-semibold">{formatCurrency(entry.amount)}</p></div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
                          <div><p className="text-xs text-muted-foreground">Purchase total</p><p className="mt-1 font-semibold">{formatCurrency(group.purchaseTotal)}</p></div>
                          <div><p className="text-xs text-muted-foreground">Advance / paid</p><p className="mt-1 font-semibold">{formatCurrency(group.paidTotal)}</p></div>
                          <div className="sm:text-right"><p className="text-xs text-muted-foreground">Due after date</p><p className="mt-1 font-semibold">{formatCurrency(group.due)}</p></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="h-fit shadow-soft">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div><CardTitle className="text-lg">Supplier payments</CardTitle><p className="mt-1 text-sm text-muted-foreground">Payments recorded against this supplier.</p></div>
          <Wallet className="mt-0.5 size-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Current due</p><p className="mt-1 font-display text-2xl font-semibold">{supplier ? formatCurrency(supplier.dueBalance) : "—"}</p></div>
              <CreditCard className="size-6 text-muted-foreground" />
            </div>
            <Button className="mt-4 w-full rounded-full" onClick={openPayment} disabled={!supplier || supplier.dueBalance <= 0}><CreditCard className="mr-2 size-4" /> Pay Supplier</Button>
          </div>
          <div className="mt-4 space-y-2">
            {payments.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              payments.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{formatTimelineDate(entry.date)}</p><p className="mt-1 text-xs uppercase text-muted-foreground">{entry.method}</p></div><p className="text-base font-semibold">{formatCurrency(entry.amount)}</p></div>
                  {entry.reference ? <p className="mt-2 text-xs text-muted-foreground">Reference: {entry.reference}</p> : null}
                  {entry.remarks ? <p className="mt-1 text-xs text-muted-foreground">{entry.remarks}</p> : null}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Pay Supplier</DialogTitle><DialogDescription>Record a payment made to {supplier?.company ?? "this supplier"}.</DialogDescription></DialogHeader>
          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4"><p className="text-sm text-muted-foreground">Current due</p><p className="mt-1 text-xl font-semibold">{supplier ? formatCurrency(supplier.dueBalance) : "—"}</p></div>
            <div className="space-y-2"><Label htmlFor="supplier-payment-panel-amount">Payment amount</Label><Input id="supplier-payment-panel-amount" type="number" min="0" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="Enter amount" /></div>
            <div className="space-y-2"><Label htmlFor="supplier-payment-panel-date">Payment date</Label><Input id="supplier-payment-panel-date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div>
            <div className="space-y-2"><Label>Payment method</Label><Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="bank">Bank Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="supplier-payment-panel-reference">Transaction ID / Reference <span className="ml-1 text-muted-foreground">(optional)</span></Label><Input id="supplier-payment-panel-reference" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Transaction ID, UTR, cheque no., etc." /></div>
            <div className="space-y-2"><Label htmlFor="supplier-payment-panel-remarks">Remarks <span className="ml-1 text-muted-foreground">(optional)</span></Label><Input id="supplier-payment-panel-remarks" value={paymentRemarks} onChange={(event) => setPaymentRemarks(event.target.value)} placeholder="Payment notes" /></div>
            {paymentError ? <p className="text-sm text-destructive">{paymentError}</p> : null}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={paymentSaving}>Cancel</Button><Button onClick={recordPayment} disabled={paymentSaving || !Number(paymentAmount) || Number(paymentAmount) <= 0 || !supplier || Number(paymentAmount) > supplier.dueBalance}>{paymentSaving ? "Recording..." : "Record Payment"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
