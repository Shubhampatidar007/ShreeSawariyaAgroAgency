import { useMemo, useState } from "react";
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
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "bank" | "cheque">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const storeSuppliers = useShopStore((state) => state.suppliers);
  const supplierId = entries[0]?.supplierId ?? "";
  const supplier = storeSuppliers.find((item) => item.id === supplierId);

  const groups = useMemo(() => {
    const byDate = new Map<string, SupplierLedgerEntry[]>();
    for (const entry of entries) {
      const group = byDate.get(entry.date) ?? [];
      group.push(entry);
      byDate.set(entry.date, group);
    }

    return Array.from(byDate, ([date, dayEntries]) => {
      const purchases = dayEntries.filter((entry) => entry.type.toLowerCase() === "purchase");
      const advances = dayEntries.filter((entry) => entry.type.toLowerCase() === "advance");
      const payments = dayEntries.filter((entry) => entry.type.toLowerCase() === "payment");
      const purchaseTotal = purchases.reduce((sum, entry) => sum + entry.amount, 0);
      const paidTotal =
        advances.reduce((sum, entry) => sum + entry.amount, 0) +
        payments.reduce((sum, entry) => sum + entry.amount, 0);

      return {
        date,
        entries: dayEntries,
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
    () =>
      [...entries]
        .filter((entry) => entry.type.toLowerCase() === "payment")
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
        <CardHeader>
          <CardTitle className="text-lg">Purchase timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No supplier transactions recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const isOpen = expandedDates.has(group.date);
                return (
                  <div key={group.date} className="overflow-hidden rounded-xl border bg-background">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/40"
                      onClick={() => toggleDate(group.date)}
                      aria-expanded={isOpen}
                    >
                      <div>
                        <p className="text-base font-semibold">{formatTimelineDate(group.date)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {group.purchases.length} transaction{group.purchases.length === 1 ? "" : "s"} · {formatCurrency(group.purchaseTotal)}
                        </p>
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
                              <div
                                key={entry.id}
                                className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_140px_140px_140px] sm:items-center"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">
                                    {entry.productName || entry.reference || "Purchase"}
                                  </p>
                                  {entry.remarks ? (
                                    <p className="mt-1 text-xs text-muted-foreground">{entry.remarks}</p>
                                  ) : null}
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quantity</p>
                                  <p className="text-sm font-medium">
                                    {entry.quantity != null ? `${entry.quantity} ${entry.unit ?? ""}` : "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rate</p>
                                  <p className="text-sm font-medium">
                                    {entry.unitPrice != null ? formatCurrency(entry.unitPrice) : "—"}
                                  </p>
                                </div>
                                <div className="sm:text-right">
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Amount</p>
                                  <p className="text-sm font-semibold">{formatCurrency(entry.amount)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Purchase total</p>
                            <p className="mt-1 font-semibold">{formatCurrency(group.purchaseTotal)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Advance / paid</p>
                            <p className="mt-1 font-semibold">{formatCurrency(group.paidTotal)}</p>
                          </div>
                          <div className="sm:text-right">
                            <p className="text-xs text-muted-foreground">Due after date</p>
                            <p className="mt-1 font-semibold">{formatCurrency(group.due)}</p>
                          </div>
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
          <div>
            <CardTitle className="text-lg">Supplier payments</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Payments recorded against this supplier.</p>
          </div>
          <Wallet className="mt-0.5 size-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Current due</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {supplier ? formatCurrency(supplier.dueBalance) : "—"}
                </p>
              </div>
              <CreditCard className="size-6 text-muted-foreground" />
            </div>
            <Button
              className="mt-4 w-full rounded-full"
              onClick={openPayment}
              disabled={!supplier || supplier.dueBalance <= 0}
            >
              <CreditCard className="mr-2 size-4" />
              Pay Supplier
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {payments.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              payments.map((entry) => (
                <div key={entry.id} className="rounded-lg border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{formatTimelineDate(entry.date)}</p>
                      <p className="mt-1 text-xs uppercase text-muted-foreground">
                        {(entry.method || "cash").toUpperCase()}
                        {entry.reference?.trim() ? ` · ${entry.reference.trim()}` : ""}
                      </p>
                      {entry.remarks ? (
                        <p className="mt-1 text-xs text-muted-foreground">{entry.remarks}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 font-display text-base font-semibold text-emerald-600">
                      {formatCurrency(entry.amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pay Supplier</DialogTitle>
            <DialogDescription>
              Record a payment made to {supplier?.company || "this supplier"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="font-semibold">{supplier?.company || "—"}</p>
              <p className="text-sm text-muted-foreground">{supplier?.name || "—"}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-panel-payment-amount">Payment amount</Label>
              <Input
                id="supplier-panel-payment-amount"
                type="number"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-panel-payment-date">Payment date</Label>
              <Input
                id="supplier-panel-payment-date"
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) =>
                  setPaymentMethod(value as "cash" | "upi" | "bank" | "cheque")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-panel-payment-reference">
                Transaction ID / Reference
                <span className="ml-1 text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="supplier-panel-payment-reference"
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="Transaction ID, UTR, cheque no., etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-panel-payment-remarks">
                Remarks
                <span className="ml-1 text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="supplier-panel-payment-remarks"
                value={paymentRemarks}
                onChange={(event) => setPaymentRemarks(event.target.value)}
                placeholder="Payment notes"
              />
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current due</span>
                <span className="font-semibold">{supplier ? formatCurrency(supplier.dueBalance) : "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment</span>
                <span className="font-semibold">{formatCurrency(Number(paymentAmount) || 0)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">Remaining due</span>
                <span className="font-bold">
                  {supplier
                    ? formatCurrency(Math.max(0, supplier.dueBalance - (Number(paymentAmount) || 0)))
                    : "—"}
                </span>
              </div>
            </div>

            {paymentError ? <p className="text-sm text-destructive">{paymentError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={paymentSaving}>
              Cancel
            </Button>
            <Button
              disabled={
                paymentSaving ||
                !supplier ||
                !Number(paymentAmount) ||
                Number(paymentAmount) <= 0 ||
                Number(paymentAmount) > (supplier?.dueBalance ?? 0)
              }
              onClick={recordPayment}
            >
              {paymentSaving ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
