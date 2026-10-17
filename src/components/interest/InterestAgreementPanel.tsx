import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  CreditCard,
  IndianRupee,
  Loader2,
  MinusCircle,
  Percent,
  Receipt,
  Send,
  Target,
  TrendingUp,
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
import { extractErrorMessage } from "@/lib/error-extract";
import { shopStore, formatCurrency, formatDate } from "@/lib/shop-store";
import type { InterestAgreement } from "@/types/business";

type PaymentMethod = "cash" | "upi" | "bank" | "cheque";

// ====================================================================
// Record Interest Payment Dialog
// ====================================================================
function RecordInterestPaymentDialog({
  agreement,
  open,
  onOpenChange,
  onSaved,
}: {
  agreement: InterestAgreement;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setMethod("cash");
      setDate(new Date().toISOString().slice(0, 10));
      setReference("");
      setNotes("");
    }
  }, [open]);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await shopStore.recordInterestPayment({
        agreementId: agreement.id,
        amount: amt,
        method,
        date,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        idempotencyKey: `interest-payment-${Date.now()}-${agreement.id}`,
      });
      toast.success("Interest payment recorded");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to record payment"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Interest Payment</DialogTitle>
          <DialogDescription>Auto-allocated: interest first, then principal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-9 text-sm"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
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
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              className="h-9 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reference (optional)</Label>
            <Input
              className="h-9 text-sm"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
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
          {(agreement.interestOutstanding ?? 0) > 0 && (agreement.outstandingPrincipal ?? 0) > 0 ? (
            <div className="rounded-md border bg-muted/40 p-2 text-xs">
              <p>
                Outstanding interest:{" "}
                <strong>{formatCurrency(agreement.interestOutstanding ?? 0)}</strong>
              </p>
              <p>
                Outstanding principal:{" "}
                <strong>{formatCurrency(agreement.outstandingPrincipal ?? 0)}</strong>
              </p>
            </div>
          ) : null}
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button size="sm" className="rounded-full" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ====================================================================
// Revise Interest Rate Dialog
// ====================================================================
function ReviseInterestRateDialog({
  agreement,
  open,
  onOpenChange,
  onSaved,
}: {
  agreement: InterestAgreement;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [newRate, setNewRate] = useState("");
  const [newPeriod, setNewPeriod] = useState<"monthly" | "annual">("annual");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNewPeriod(agreement.ratePeriod);
      setEffectiveDate(new Date().toISOString().slice(0, 10));
      setNewRate("");
      setReason("");
    }
  }, [open, agreement.ratePeriod]);

  const submit = async () => {
    const rate = Number(newRate);
    if (!rate || rate < 0) {
      toast.error("Enter a valid rate");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setSaving(true);
    try {
      await shopStore.reviseInterestRate({
        agreementId: agreement.id,
        newRate: rate,
        newRatePeriod: newPeriod,
        effectiveDate,
        reason: reason.trim(),
        idempotencyKey: `rate-revise-${Date.now()}-${agreement.id}`,
      });
      toast.success("Interest rate revised");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to revise rate"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revise Interest Rate</DialogTitle>
          <DialogDescription>
            Effective date applies the new rate from that day forward. Prior periods use the old
            rate.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">New rate (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-9 text-sm"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rate period</Label>
              <Select
                value={newPeriod}
                onValueChange={(v) => setNewPeriod(v as "monthly" | "annual")}
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
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Effective date</Label>
            <Input
              type="date"
              className="h-9 text-sm"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason (required)</Label>
            <Textarea
              rows={2}
              className="text-sm"
              placeholder="e.g. Customer renegotiated"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button size="sm" className="rounded-full" onClick={submit} disabled={saving}>
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Percent className="size-3.5" />
            )}
            Revise rate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ====================================================================
// Interest Adjustment Dialog (waiver / write-off)
// ====================================================================
function InterestAdjustmentDialog({
  agreement,
  open,
  onOpenChange,
  onSaved,
}: {
  agreement: InterestAgreement;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [adjustmentType, setAdjustmentType] = useState<"waiver" | "write_off" | "other">("waiver");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAdjustmentType("waiver");
      setDelta("");
      setReason("");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const submit = async () => {
    const d = Number(delta);
    if (adjustmentType !== "other" && (!d || d <= 0)) {
      toast.error("Enter a valid positive amount to waive/write off");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setSaving(true);
    try {
      const interestDelta = adjustmentType === "waiver" ? -d : 0;
      const principalDelta = adjustmentType === "write_off" ? -d : 0;
      await shopStore.recordInterestAdjustment({
        agreementId: agreement.id,
        adjustmentType,
        interestDelta,
        principalDelta,
        reason: reason.trim(),
        adjustmentDate: date,
        idempotencyKey: `interest-adj-${Date.now()}-${agreement.id}`,
      });
      toast.success(
        `${adjustmentType === "waiver" ? "Interest waived" : adjustmentType === "write_off" ? "Principal written off" : "Adjustment recorded"}`,
      );
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to record adjustment"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Adjustment</DialogTitle>
          <DialogDescription>
            Waiver reduces owed interest. Write-off reduces owed principal. Both require approval.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Adjustment type</Label>
            <Select
              value={adjustmentType}
              onValueChange={(v) => setAdjustmentType(v as "waiver" | "write_off" | "other")}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waiver">Interest waiver</SelectItem>
                <SelectItem value="write_off">Principal write-off</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {adjustmentType !== "other" ? (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Amount (₹) to {adjustmentType === "waiver" ? "waive" : "write off"}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-9 text-sm"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label className="text-xs">Effective date</Label>
            <Input
              type="date"
              className="h-9 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason (required)</Label>
            <Textarea
              rows={2}
              className="text-sm"
              placeholder="e.g. Approved by owner on YYYY-MM-DD"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button size="sm" className="rounded-full" onClick={submit} disabled={saving}>
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <MinusCircle className="size-3.5" />
            )}
            Record adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ====================================================================
// Settle Agreement Dialog
// ====================================================================
function SettleAgreementDialog({
  agreement,
  open,
  onOpenChange,
  onSaved,
}: {
  agreement: InterestAgreement;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const totalSettlement = agreement.totalSettlement ?? 0;

  const submit = async () => {
    setSaving(true);
    try {
      await shopStore.settleInterestAgreement({
        agreementId: agreement.id,
        settlementDate: date,
        reason: reason.trim() || "Settled in full",
        idempotencyKey: `settle-${Date.now()}-${agreement.id}`,
      });
      toast.success("Agreement settled and closed");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to settle agreement"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settle & Close Agreement</DialogTitle>
          <DialogDescription>
            Only succeeds if the total settlement amount is zero. Make sure all principal and
            interest have been paid first.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-2.5 text-sm">
            <p>
              Outstanding interest:{" "}
              <strong>{formatCurrency(agreement.interestOutstanding ?? 0)}</strong>
            </p>
            <p>
              Outstanding principal:{" "}
              <strong>{formatCurrency(agreement.outstandingPrincipal ?? 0)}</strong>
            </p>
            <p className="mt-1.5 border-t pt-1.5">
              Total settlement:{" "}
              <strong className={totalSettlement > 0 ? "text-warning" : "text-success"}>
                {formatCurrency(totalSettlement)}
              </strong>
            </p>
          </div>
          {totalSettlement > 0 ? (
            <p className="text-xs text-destructive">
              Cannot settle: outstanding balance is non-zero. Record the final payment first, then
              try again.
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Settlement date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reason (optional)</Label>
                <Textarea
                  rows={2}
                  className="text-sm"
                  placeholder="e.g. Customer paid full settlement"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="rounded-full"
            onClick={submit}
            disabled={saving || totalSettlement > 0}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Receipt className="size-3.5" />
            )}
            Settle & close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ====================================================================
// InterestAgreementCard — single agreement display + action buttons
// ====================================================================
function InterestAgreementCard({
  agreement,
  onSaved,
}: {
  agreement: InterestAgreement;
  onSaved: () => void;
}) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);

  const isLoan = agreement.agreementType === "loan";
  const isPaused = agreement.status === "paused";
  const isSettled = agreement.status === "settled" || agreement.status === "closed";

  const statusTone = isSettled
    ? "bg-success/15 text-success"
    : isPaused
      ? "bg-warning/15 text-warning"
      : "bg-primary/15 text-primary";

  return (
    <Card className="shadow-soft">
      <CardHeader className="py-3 sm:py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              {isLoan ? (
                <Wallet className="size-4 text-primary" />
              ) : (
                <IndianRupee className="size-4 text-primary" />
              )}
              {isLoan ? "Direct loan" : "Sale-backed interest"}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone}`}
              >
                {agreement.status}
              </span>
            </CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Started {formatDate(agreement.interestStartDate)} · {agreement.interestRate}%{" "}
              {agreement.ratePeriod} simple
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* 4-col summary: original principal, outstanding principal, interest outstanding, total settlement */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Original principal
            </p>
            <p className="mt-0.5 text-sm font-semibold">
              {formatCurrency(agreement.originalPrincipal)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Outstanding principal
            </p>
            <p className="mt-0.5 text-sm font-semibold">
              {formatCurrency(agreement.outstandingPrincipal)}
            </p>
          </div>
          <div className="rounded-lg bg-warning/10 px-2.5 py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Interest outstanding
            </p>
            <p className="mt-0.5 text-sm font-semibold text-warning">
              {formatCurrency(agreement.interestOutstanding ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Total settlement
            </p>
            <p className="mt-0.5 text-sm font-semibold text-primary">
              {formatCurrency(agreement.totalSettlement ?? 0)}
            </p>
          </div>
        </div>

        {/* Progress + paid breakdown */}
        <div className="rounded-lg border p-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span>
              Interest paid: <strong>{formatCurrency(agreement.interestPaidTotal ?? 0)}</strong>
            </span>
            <span>
              Principal paid: <strong>{formatCurrency(agreement.principalPaidTotal ?? 0)}</strong>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, ((agreement.principalPaidTotal ?? 0) / Math.max(agreement.originalPrincipal, 1)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {agreement.notes ? (
          <p className="text-xs italic text-muted-foreground">"{agreement.notes}"</p>
        ) : null}

        {/* Actions */}
        {!isSettled ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setPaymentOpen(true)}
            >
              <CreditCard className="size-3.5" />
              Payment
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setReviseOpen(true)}
            >
              <Percent className="size-3.5" />
              Revise rate
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setAdjustmentOpen(true)}
            >
              <MinusCircle className="size-3.5" />
              Waiver / adjust
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setSettleOpen(true)}
            >
              <Receipt className="size-3.5" />
              Settle
            </Button>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Closed {agreement.closedAt ? formatDate(agreement.closedAt.slice(0, 10)) : ""} ·{" "}
            {agreement.closedReason ?? ""}
          </p>
        )}

        {/* Dialogs */}
        <RecordInterestPaymentDialog
          agreement={agreement}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onSaved={onSaved}
        />
        <ReviseInterestRateDialog
          agreement={agreement}
          open={reviseOpen}
          onOpenChange={setReviseOpen}
          onSaved={onSaved}
        />
        <InterestAdjustmentDialog
          agreement={agreement}
          open={adjustmentOpen}
          onOpenChange={setAdjustmentOpen}
          onSaved={onSaved}
        />
        <SettleAgreementDialog
          agreement={agreement}
          open={settleOpen}
          onOpenChange={setSettleOpen}
          onSaved={onSaved}
        />
      </CardContent>
    </Card>
  );
}

// ====================================================================
// InterestAgreementPanel — list all agreements for a customer
// ====================================================================
export function InterestAgreementPanel({ customerId }: { customerId: string }) {
  const [agreements, setAgreements] = useState<InterestAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await shopStore.loadCustomerInterestAgreements(customerId);
      setAgreements(result);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to load interest agreements"));
      setAgreements([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Card className="shadow-soft">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Loading interest agreements…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 shadow-soft">
        <CardContent className="py-4 text-sm text-destructive">
          {error}
          <Button
            size="sm"
            variant="outline"
            className="ml-2 rounded-full"
            onClick={() => void load()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (agreements.length === 0) {
    return null; // No panel rendered if no agreements — keeps Khata page clean.
  }

  const active = agreements.filter((a) => a.status === "active" || a.status === "paused");
  const closed = agreements.filter((a) => a.status === "settled" || a.status === "closed");

  return (
    <div className="space-y-3">
      {active.length > 0 ? (
        <Card className="shadow-soft">
          <CardHeader className="py-3 sm:py-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Percent className="size-4 text-primary" />
              Interest Agreements
              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                {active.length} active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="grid gap-3 lg:grid-cols-2">
              {active.map((a) => (
                <InterestAgreementCard key={a.id} agreement={a} onSaved={() => void load()} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {closed.length > 0 ? (
        <details className="rounded-xl border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Closed/settled agreements ({closed.length})
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {closed.map((a) => (
              <InterestAgreementCard key={a.id} agreement={a} onSaved={() => void load()} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
