import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  IndianRupee,
  MessageCircle,
  Printer,
  Send,
  Truck,
  Wallet,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/admin/EmptyState";
import { DetailHeader } from "@/components/shared/DetailHeader";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { SupplierTransactionTimeline } from "@/components/suppliers/SupplierTransactionTimeline";
import {
  formatCurrency,
  shopStore,
  useShopStore,
} from "@/lib/shop-store";
import {
  sendWhatsAppBatch,
  type WhatsAppRecipient,
} from "@/lib/whatsapp";

export const Route = createFileRoute("/admin/ledger/suppliers/$supplierId")({
  head: () => ({
    meta: [
      { title: "Supplier Ledger — Admin" },
      {
        name: "description",
        content: "Supplier purchases, payments, advances and running balance.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupplierLedgerPage,
});

type SupplierReminderForm = {
  advancePay: string;
  otherImportant: string;
  message: string;
};

const buildSupplierReminderMessage = ({
  supplierName,
  totalRecords,
  totalPurchases,
  totalPaid,
  advancePay,
  dueBalance,
  otherImportant,
}: {
  supplierName: string;
  totalRecords: number;
  totalPurchases: number;
  totalPaid: number;
  advancePay: string;
  dueBalance: number;
  otherImportant: string;
}) =>
  [
    `Hello ${supplierName || "Supplier"},`,
    "",
    "Order update from Shree Sawariya Agro Agency.",
    "",
    `Total records: ${totalRecords}`,
    `Total purchases: ${formatCurrency(totalPurchases)}`,
    `Total paid: ${formatCurrency(totalPaid)}`,
    `Advance pay: ${formatCurrency(Number(advancePay) || 0)}`,
    `Due balance: ${formatCurrency(dueBalance)}`,
    `Other important: ${otherImportant.trim() || "—"}`,
    "",
    "Thank you,",
    "Shree Sawariya Agro Agency",
  ].join("\n");

function SupplierLedgerPage() {
  const { supplierId } = Route.useParams();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "bank" | "cheque">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [reminderForm, setReminderForm] = useState<SupplierReminderForm>({
    advancePay: "0",
    otherImportant: "",
    message: "",
  });

  const supplier = useShopStore((s) => s.suppliers.find((x) => x.id === supplierId));
  const ledger = useShopStore((s) =>
    s.supplierLedger.filter((entry) => entry.supplierId === supplierId),
  );

  const sorted = useMemo(
    () => [...ledger].sort((a, b) => b.date.localeCompare(a.date)),
    [ledger],
  );

  const totalRecords = sorted.length;

  if (!supplier) {
    return (
      <EmptyState
        icon={Truck}
        title="Supplier not found"
        description="This supplier no longer exists."
        action={<span />}
      />
    );
  }

  const openWhatsAppReminder = () => {
    if (!supplier.mobile?.trim()) {
      toast.error("Supplier mobile number is missing.");
      return;
    }

    const advancePay = String(supplier.advance || 0);
    setReminderForm({
      advancePay,
      otherImportant: "",
      message: buildSupplierReminderMessage({
        supplierName: supplier.name || supplier.company,
        totalRecords,
        totalPurchases: supplier.totalPurchases,
        totalPaid: supplier.totalPaid,
        advancePay,
        dueBalance: supplier.dueBalance,
        otherImportant: "",
      }),
    });
    setWhatsappResult(null);
    setWhatsappOpen(true);
  };

  const sendSupplierWhatsApp = async () => {
    if (!supplier.mobile?.trim()) {
      setWhatsappResult({ ok: false, text: "Supplier mobile number is missing." });
      return;
    }

    const advancePay = Number(reminderForm.advancePay);
    if (!Number.isFinite(advancePay) || advancePay < 0) {
      setWhatsappResult({ ok: false, text: "Enter a valid advance pay amount." });
      return;
    }

    const message = reminderForm.message.trim();
    if (!message) {
      setWhatsappResult({ ok: false, text: "Message cannot be empty." });
      return;
    }

    setWhatsappSending(true);
    setWhatsappResult(null);

    const recipient: WhatsAppRecipient = {
      id: supplier.id,
      name: supplier.name || supplier.company,
      mobile: supplier.mobile,
      due: supplier.dueBalance,
      village: "",
      lastPurchase: supplier.lastOrder,
    };

    try {
      const response = await sendWhatsAppBatch({
        kind: "custom",
        recipients: [recipient],
        message,
        metadata: {
          recordType: "supplier-ledger-reminder",
          supplierId: supplier.id,
          totalRecords,
          advancePay,
          otherImportant: reminderForm.otherImportant.trim(),
        },
      });

      const text = response.note || "Supplier WhatsApp reminder sent successfully.";
      setWhatsappResult({ ok: response.ok, text });
      if (response.ok) toast.success("Supplier reminder sent on WhatsApp.");
      else toast.error(text);
    } catch (error) {
      const text = error instanceof Error ? error.message : "WhatsApp delivery failed.";
      setWhatsappResult({ ok: false, text });
      toast.error(text);
    } finally {
      setWhatsappSending(false);
    }
  };

  const openPayment = () => {
    setPaymentError("");
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentRemarks("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("cash");
    setPaymentOpen(true);
  };

  const recordPayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
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
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Failed to record payment.");
    } finally {
      setPaymentSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <DetailHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Suppliers", to: "/admin/suppliers" },
          { label: supplier.company },
          { label: "Ledger" },
        ]}
        title={`${supplier.company} — Ledger`}
        subtitle={`${supplier.name} · ${supplier.mobile} · GSTIN ${supplier.gstin}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              className="rounded-full"
              variant="outline"
              onClick={openWhatsAppReminder}
              disabled={!supplier.mobile?.trim() || whatsappSending}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Send via WhatsApp
            </Button>
            <Button
              className="rounded-full"
              onClick={openPayment}
              disabled={supplier.dueBalance <= 0}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Pay Supplier
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        }
      />

      <SummaryCards
        items={[
          { label: "Total purchases", value: formatCurrency(supplier.totalPurchases), icon: IndianRupee },
          { label: "Total paid", value: formatCurrency(supplier.totalPaid), icon: Wallet, tone: "success" },
          { label: "Advance", value: formatCurrency(supplier.advance), icon: Wallet },
          {
            label: "Due balance",
            value: formatCurrency(supplier.dueBalance),
            icon: Truck,
            tone: supplier.dueBalance > 0 ? "warning" : "success",
          },
        ]}
      />

      <SupplierTransactionTimeline entries={sorted} />

      <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send supplier reminder</DialogTitle>
            <DialogDescription>
              Compose the account update that will be sent to {supplier.name || supplier.company} on WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="font-semibold">{supplier.company}</p>
              <p className="text-sm text-muted-foreground">{supplier.name} · {supplier.mobile}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {totalRecords} {totalRecords === 1 ? "record" : "records"} in this ledger view
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-reminder-advance-pay">Advance Pay</Label>
                <Input
                  id="supplier-reminder-advance-pay"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={reminderForm.advancePay}
                  onChange={(event) =>
                    setReminderForm((current) => ({ ...current, advancePay: event.target.value }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-reminder-other-important">Other Important</Label>
                <Input
                  id="supplier-reminder-other-important"
                  value={reminderForm.otherImportant}
                  onChange={(event) =>
                    setReminderForm((current) => ({ ...current, otherImportant: event.target.value }))
                  }
                  placeholder="Notes for supplier"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-reminder-message">WhatsApp message</Label>
              <Textarea
                id="supplier-reminder-message"
                value={reminderForm.message}
                onChange={(event) =>
                  setReminderForm((current) => ({ ...current, message: event.target.value }))
                }
                rows={11}
                className="resize-none"
              />
            </div>
            {whatsappResult && (
              <p className={`text-sm ${whatsappResult.ok ? "text-emerald-600" : "text-destructive"}`}>
                {whatsappResult.text}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsappOpen(false)} disabled={whatsappSending}>
              Close
            </Button>
            <Button onClick={sendSupplierWhatsApp} disabled={whatsappSending || !supplier.mobile?.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {whatsappSending ? "Sending…" : "Send via WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pay Supplier</DialogTitle>
            <DialogDescription>Record a payment made to {supplier.company}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="font-semibold">{supplier.company}</p>
              <p className="text-sm text-muted-foreground">{supplier.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-payment-amount">Payment amount</Label>
              <Input
                id="supplier-payment-amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-payment-date">Payment date</Label>
              <Input id="supplier-payment-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-payment-reference">Transaction ID / Reference <span className="ml-1 text-muted-foreground">(optional)</span></Label>
              <Input id="supplier-payment-reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Transaction ID, UTR, cheque no., etc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-payment-remarks">Remarks <span className="ml-1 text-muted-foreground">(optional)</span></Label>
              <Input id="supplier-payment-remarks" value={paymentRemarks} onChange={(e) => setPaymentRemarks(e.target.value)} placeholder="Payment notes" />
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Current due</span><span className="font-semibold">{formatCurrency(supplier.dueBalance)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Payment</span><span className="font-semibold">{formatCurrency(Number(paymentAmount) || 0)}</span></div>
              <div className="border-t pt-2 flex justify-between"><span className="font-medium">Remaining due</span><span className="font-bold">{formatCurrency(Math.max(0, supplier.dueBalance - (Number(paymentAmount) || 0)))}</span></div>
            </div>
            {paymentError && <p className="text-sm text-destructive">{paymentError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={paymentSaving}>Cancel</Button>
            <Button
              disabled={paymentSaving || !Number(paymentAmount) || Number(paymentAmount) <= 0 || Number(paymentAmount) > supplier.dueBalance}
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
