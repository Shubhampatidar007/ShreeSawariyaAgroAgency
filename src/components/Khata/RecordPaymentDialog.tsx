import { useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { formatCurrency, shopStore } from "@/lib/shop-store";
import type { PaymentMethod } from "@/types/business";

type Props = {
  customer: { id: string; name: string; currentDue: number };
  trigger: React.ReactNode;
  onRecorded?: (transactionId: string) => void;
};

export function RecordPaymentDialog({ customer, trigger, onRecorded }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");

  const reset = () => {
    setAmount("");
    setMethod("cash");
    setEntryDate(new Date().toISOString().slice(0, 10));
    setRemarks("");
  };

  const amountNum = Number(amount) || 0;
  const exceedsDue = amountNum > customer.currentDue && customer.currentDue > 0;

  const handleSubmit = async () => {
    if (!amountNum || amountNum <= 0) return toast.error("Enter a valid payment amount");
    setSubmitting(true);
    try {
      const txId = await shopStore.recordKhataPayment({
        customerId: customer.id,
        amount: amountNum,
        method,
        date: entryDate,
        remarks: remarks.trim() || undefined,
      });
      toast.success(`Payment of ${formatCurrency(amountNum)} recorded`);
      onRecorded?.(txId);
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record the payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-5" /> Record payment
          </DialogTitle>
          <DialogDescription>
            {customer.name} · Current due: <strong>{formatCurrency(customer.currentDue)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Amount received</Label>
            <Input
              type="number"
              min="0"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
            {exceedsDue && (
              <p className="text-xs text-warning">
                This exceeds the current due of {formatCurrency(customer.currentDue)} — will be recorded as an advance.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank">Bank transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Note / reference (optional)</Label>
            <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" className="rounded-full" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />} Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
