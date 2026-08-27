import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, IndianRupee, MessageCircle, Printer, Send, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/admin/EmptyState";
import { DetailHeader } from "@/components/shared/DetailHeader";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { formatCurrency, formatDate, shopStore, useShopStore } from "@/lib/shop-store";
import { loadSupplierSessionDeliveries, loadSupplierSessions, type SupplierSession, type SupplierSessionDelivery } from "@/lib/supplier-session";
import { sendWhatsAppBatch, type WhatsAppRecipient } from "@/lib/whatsapp";

export const Route = createFileRoute("/admin/ledger/suppliers/$supplierId")({
  head: () => ({
    meta: [
      { title: "Supplier Ledger — Admin" },
      { name: "description", content: "Supplier purchases grouped by stock session." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupplierLedgerPage,
});

type SupplierReminderForm = { advancePay: string; otherImportant: string; message: string };

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const buildSupplierReminderMessage = ({ supplierName, totalSessions, totalPurchases, totalPaid, advancePay, dueBalance, otherImportant }: {
  supplierName: string;
  totalSessions: number;
  totalPurchases: number;
  totalPaid: number;
  advancePay: string;
  dueBalance: number;
  otherImportant: string;
}) => [
  `Hello ${supplierName || "Supplier"},`, "", "Order update from Shree Sawariya Agro Agency.", "",
  `Sessions: ${totalSessions}`,
  `Total purchases: ${formatCurrency(totalPurchases)}`,
  `Total paid: ${formatCurrency(totalPaid)}`,
  `Advance pay: ${formatCurrency(Number(advancePay) || 0)}`,
  `Due balance: ${formatCurrency(dueBalance)}`,
  `Other important: ${otherImportant.trim() || "—"}`,
  "", "Thank you,", "Shree Sawariya Agro Agency",
].join("\n");

function SupplierLedgerPage() {
  const { supplierId } = Route.useParams();
  const supplier = useShopStore((s) => s.suppliers.find((x) => x.id === supplierId));
  const legacyLedger = useShopStore((s) => s.supplierLedger.filter((entry) => entry.supplierId === supplierId));
  const [sessions, setSessions] = useState<SupplierSession[]>([]);
  const [sessionDeliveries, setSessionDeliveries] = useState<SupplierSessionDelivery[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionError, setSessionError] = useState("");
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
  const [reminderForm, setReminderForm] = useState<SupplierReminderForm>({ advancePay: "0", otherImportant: "", message: "" });

  useEffect(() => {
    let cancelled = false;
    setLoadingSessions(true);
    Promise.all([loadSupplierSessions(supplierId), loadSupplierSessionDeliveries(supplierId)])
      .then(([loadedSessions, loadedDeliveries]) => {
        if (cancelled) return;
        setSessions(loadedSessions);
        setSessionDeliveries(loadedDeliveries);
        setActiveSessionId((current) => current || loadedSessions[0]?.id || "");
        setSessionError("");
      })
      .catch((error) => {
        if (!cancelled) setSessionError(error instanceof Error ? error.message : "Failed to load supplier sessions.");
      })
      .finally(() => { if (!cancelled) setLoadingSessions(false); });
    return () => { cancelled = true; };
  }, [supplierId, legacyLedger.length]);

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  const activeDeliveries = useMemo(
    () => sessionDeliveries.filter((entry) => entry.sessionId === activeSession?.id),
    [sessionDeliveries, activeSession?.id],
  );
  const totalSessions = sessions.length;
  const totalRecords = legacyLedger.length;

  if (!supplier) {
    return <EmptyState icon={Truck} title="Supplier not found" description="This supplier no longer exists." action={<span />} />;
  }

  const openWhatsAppReminder = () => {
    if (!supplier.mobile?.trim()) return toast.error("Supplier mobile number is missing.");
    const initialForm: SupplierReminderForm = {
      advancePay: String(supplier.advance || 0),
      otherImportant: "",
      message: buildSupplierReminderMessage({
        supplierName: supplier.name || supplier.company,
        totalSessions,
        totalPurchases: supplier.totalPurchases,
        totalPaid: supplier.totalPaid,
        advancePay: String(supplier.advance || 0),
        dueBalance: supplier.dueBalance,
        otherImportant: "",
      }),
    };
    setReminderForm(initialForm);
    setWhatsappResult(null);
    setWhatsappOpen(true);
  };

  const sendSupplierWhatsApp = async () => {
    if (!supplier.mobile?.trim()) return setWhatsappResult({ ok: false, text: "Supplier mobile number is missing." });
    const advancePay = Number(reminderForm.advancePay);
    if (!Number.isFinite(advancePay) || advancePay < 0) return setWhatsappResult({ ok: false, text: "Enter a valid advance pay amount." });
    const message = reminderForm.message.trim();
    if (!message) return setWhatsappResult({ ok: false, text: "Message cannot be empty." });
    setWhatsappSending(true);
    setWhatsappResult(null);
    const recipient: WhatsAppRecipient = { id: supplier.id, name: supplier.name || supplier.company, mobile: supplier.mobile, due: supplier.dueBalance, village: "", lastPurchase: supplier.lastOrder };
    try {
      const response = await sendWhatsAppBatch({
        kind: "custom",
        recipients: [recipient],
        message,
        metadata: { recordType: "supplier-ledger-reminder", supplierId: supplier.id, totalSessions, advancePay, otherImportant: reminderForm.otherImportant.trim() },
      });
      const text = response.note || "Supplier WhatsApp reminder sent successfully.";
      setWhatsappResult({ ok: response.ok, text });
      if (response.ok) toast.success("Supplier reminder sent on WhatsApp."); else toast.error(text);
    } catch (error) {
      const text = error instanceof Error ? error.message : "WhatsApp delivery failed.";
      setWhatsappResult({ ok: false, text });
      toast.error(text);
    } finally { setWhatsappSending(false); }
  };

  return (
    <div className="space-y-6">
      <DetailHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Suppliers", to: "/admin/suppliers" }, { label: supplier.company }, { label: "Ledger" }]}
        title={`${supplier.company} — Ledger`}
        subtitle={`${supplier.name} · ${supplier.mobile} · GSTIN ${supplier.gstin}`}
        actions={<div className="flex flex-wrap items-center gap-2">
          <Button className="rounded-full" variant="outline" onClick={openWhatsAppReminder} disabled={!supplier.mobile?.trim() || whatsappSending}><MessageCircle className="mr-2 h-4 w-4" />Send via WhatsApp</Button>
          <Button className="rounded-full" onClick={() => { setPaymentError(""); setPaymentAmount(""); setPaymentReference(""); setPaymentRemarks(""); setPaymentDate(new Date().toISOString().slice(0, 10)); setPaymentMethod("cash"); setPaymentOpen(true); }} disabled={supplier.dueBalance <= 0}><CreditCard className="mr-2 h-4 w-4" />Pay Supplier</Button>
          <Button variant="outline" className="rounded-full" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
        </div>}
      />

      <SummaryCards items={[
        { label: "Total purchases", value: formatCurrency(supplier.totalPurchases), icon: IndianRupee },
        { label: "Total paid", value: formatCurrency(supplier.totalPaid), icon: Wallet, tone: "success" },
        { label: "Advance", value: formatCurrency(supplier.advance), icon: Wallet },
        { label: "Due balance", value: formatCurrency(supplier.dueBalance), icon: Truck, tone: supplier.dueBalance > 0 ? "warning" : "success" },
      ]} />

      <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Purchase sessions</CardTitle>
              <span className="rounded-full border bg-muted/30 px-3 py-1 text-xs font-medium">{totalSessions} sessions</span>
            </div>
            <p className="text-xs text-muted-foreground">Every session contains one or more deliveries.</p>
          </CardHeader>
          <CardContent>
            {loadingSessions ? <p className="py-8 text-center text-sm text-muted-foreground">Loading sessions…</p> : sessionError ? <p className="py-8 text-center text-sm text-destructive">{sessionError}</p> : sessions.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No grouped sessions yet.</p> : (
              <div className="relative space-y-3 pl-4" aria-label="Supplier purchase session timeline">
                <div className="absolute bottom-2 left-1.5 top-2 w-px bg-border" aria-hidden="true" />
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    aria-current={activeSession?.id === session.id ? "true" : undefined}
                    aria-label={`Open session ${session.sessionCode}`}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`relative block w-full rounded-xl border p-4 text-left transition ${activeSession?.id === session.id ? "border-primary bg-primary/5 shadow-sm" : "bg-card hover:bg-muted/40"}`}
                  >
                    <span className="absolute -left-[1.16rem] top-5 h-3 w-3 rounded-full border-2 border-background bg-primary" aria-hidden="true" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{session.sessionCode}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(session.startedAt)}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] font-medium">{session.deliveryCount} delivery{session.deliveryCount === 1 ? "" : "ies"}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div><p className="text-muted-foreground">Purchase</p><p className="font-semibold">{formatCurrency(session.totalPurchase)}</p></div>
                      <div><p className="text-muted-foreground">Due</p><p className="font-semibold">{formatCurrency(session.totalDue)}</p></div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-soft">
          <CardHeader className="border-b">
            {activeSession ? <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">Session</p>
                  <CardTitle className="mt-1 text-lg">{activeSession.sessionCode}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(activeSession.startedAt)} · {activeSession.status}</p>
                </div>
                <div className="text-right"><p className="text-xs text-muted-foreground">Session due</p><p className="text-lg font-bold">{formatCurrency(activeSession.totalDue)}</p></div>
              </div>
              {activeSession.notes && <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{activeSession.notes}</p>}
            </> : <CardTitle className="text-base">Session details</CardTitle>}
          </CardHeader>
          <CardContent className="p-0">
            {activeSession ? (
              <div className="p-4">
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Deliveries in active session">
                  {activeDeliveries.filter((entry) => entry.type === "purchase").map((delivery, index) => (
                    <span key={delivery.id} role="tab" aria-selected="true" className="whitespace-nowrap rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium">
                      Delivery {index + 1} · {delivery.productName || delivery.reference}
                    </span>
                  ))}
                  {activeDeliveries.some((entry) => entry.type === "advance") && <span className="whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">Advance {formatCurrency(activeSession.totalAdvance)}</span>}
                </div>

                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="bg-muted/30 text-xs text-muted-foreground"><tr>
                      <th className="px-3 py-3 text-left font-medium">Delivery</th><th className="px-3 py-3 text-left font-medium">Qty</th><th className="px-3 py-3 text-right font-medium">Rate</th><th className="px-3 py-3 text-right font-medium">Amount</th><th className="px-3 py-3 text-right font-medium">Balance</th>
                    </tr></thead>
                    <tbody>
                      {activeDeliveries.filter((entry) => entry.type === "purchase").map((delivery, index) => (
                        <tr key={delivery.id} className="border-t">
                          <td className="px-3 py-3"><p className="font-medium">{delivery.productName || delivery.reference}</p><p className="text-xs text-muted-foreground">Delivery {index + 1} · {formatDate(delivery.date)}</p></td>
                          <td className="px-3 py-3">{delivery.quantity} {delivery.unit}</td>
                          <td className="px-3 py-3 text-right">{formatCurrency(delivery.unitPrice)}</td>
                          <td className="px-3 py-3 text-right font-semibold">{formatCurrency(delivery.amount)}</td>
                          <td className="px-3 py-3 text-right font-semibold">{formatCurrency(delivery.balance)}</td>
                        </tr>
                      ))}
                      {activeDeliveries.filter((entry) => entry.type === "advance").map((delivery) => (
                        <tr key={delivery.id} className="border-t bg-emerald-50/40"><td className="px-3 py-3 font-medium" colSpan={3}>Advance · {delivery.method}</td><td className="px-3 py-3 text-right font-semibold text-emerald-700">-{formatCurrency(delivery.amount)}</td><td className="px-3 py-3 text-right font-semibold">{formatCurrency(delivery.balance)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : <p className="p-10 text-center text-sm text-muted-foreground">Select a session to see its deliveries.</p>}
          </CardContent>
        </Card>
      </div>

      {totalRecords > 0 && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Other ledger activity</CardTitle><p className="text-xs text-muted-foreground">Payments and legacy entries remain visible without breaking the new session grouping.</p></CardHeader>
          <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="bg-muted/30 text-xs text-muted-foreground"><tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Reference</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-left">Method</th></tr></thead><tbody>{legacyLedger.filter((entry) => entry.type === "payment").map((entry) => <tr key={entry.id} className="border-t"><td className="px-4 py-3">{formatDate(entry.date)}</td><td className="px-4 py-3 capitalize">{entry.type}</td><td className="px-4 py-3">{entry.reference}</td><td className="px-4 py-3 text-right font-semibold">{formatCurrency(entry.amount)}</td><td className="px-4 py-3 text-right">{formatCurrency(entry.balance)}</td><td className="px-4 py-3 uppercase text-xs text-muted-foreground">{entry.method}</td></tr>)}</tbody></table></div></CardContent>
        </Card>
      )}

      <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Send supplier reminder</DialogTitle><DialogDescription>Send the grouped session account update to {supplier.name || supplier.company}.</DialogDescription></DialogHeader>
          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4"><p className="text-sm text-muted-foreground">Supplier</p><p className="font-semibold">{supplier.company}</p><p className="text-sm text-muted-foreground">{supplier.name} · {supplier.mobile}</p><p className="mt-2 text-xs text-muted-foreground">{totalSessions} purchase sessions</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="supplier-reminder-advance-pay">Advance Pay</Label><Input id="supplier-reminder-advance-pay" type="number" min="0" step="0.01" value={reminderForm.advancePay} onChange={(e) => setReminderForm((current) => ({ ...current, advancePay: e.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="supplier-reminder-other-important">Other Important</Label><Input id="supplier-reminder-other-important" value={reminderForm.otherImportant} onChange={(e) => setReminderForm((current) => ({ ...current, otherImportant: e.target.value }))} placeholder="Notes for supplier" /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="supplier-reminder-message">WhatsApp message</Label><Textarea id="supplier-reminder-message" value={reminderForm.message} onChange={(e) => setReminderForm((current) => ({ ...current, message: e.target.value }))} rows={11} className="resize-none" /></div>
            {whatsappResult && <p className={`text-sm ${whatsappResult.ok ? "text-emerald-600" : "text-destructive"}`}>{whatsappResult.text}</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setWhatsappOpen(false)} disabled={whatsappSending}>Close</Button><Button onClick={sendSupplierWhatsApp} disabled={whatsappSending || !supplier.mobile?.trim()}><Send className="mr-2 h-4 w-4" />{whatsappSending ? "Sending…" : "Send via WhatsApp"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Pay Supplier</DialogTitle><DialogDescription>Record a payment made to {supplier.company}.</DialogDescription></DialogHeader>
          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4"><p className="text-sm text-muted-foreground">Current due</p><p className="text-2xl font-bold">{formatCurrency(supplier.dueBalance)}</p></div>
            <div className="space-y-2"><Label htmlFor="supplier-payment-amount">Payment amount</Label><Input id="supplier-payment-amount" type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} inputMode="decimal" min="0" step="0.01" placeholder="Enter amount" /></div>
            <div className="space-y-2"><Label htmlFor="supplier-payment-date">Payment date</Label><Input id="supplier-payment-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Payment method</Label><Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}><SelectTrigger aria-label="Payment method"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="bank">Bank Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="supplier-payment-reference">Transaction ID / Reference</Label><Input id="supplier-payment-reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="UTR, cheque no., etc." /></div>
            <div className="space-y-2"><Label htmlFor="supplier-payment-remarks">Remarks</Label><Input id="supplier-payment-remarks" value={paymentRemarks} onChange={(e) => setPaymentRemarks(e.target.value)} placeholder="Payment notes" /></div>
            <div className="rounded-lg border p-4"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Remaining due</span><span className="font-bold">{formatCurrency(Math.max(0, supplier.dueBalance - (Number(paymentAmount) || 0)))}</span></div></div>
            {paymentError && <p className="text-sm text-destructive">{paymentError}</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={paymentSaving}>Cancel</Button><Button disabled={paymentSaving || !Number(paymentAmount) || Number(paymentAmount) <= 0 || Number(paymentAmount) > supplier.dueBalance} onClick={async () => {
            const amount = Number(paymentAmount);
            if (!amount || amount <= 0) return setPaymentError("Enter a valid payment amount.");
            if (amount > supplier.dueBalance) return setPaymentError(`Payment cannot exceed ${formatCurrency(supplier.dueBalance)}.`);
            setPaymentSaving(true); setPaymentError("");
            try { await shopStore.recordSupplierPayment({ supplierId: supplier.id, amount, method: paymentMethod, date: paymentDate, reference: paymentReference.trim(), remarks: paymentRemarks.trim() }); setPaymentOpen(false); toast.success("Supplier payment recorded"); }
            catch (error) { setPaymentError(error instanceof Error ? error.message : "Failed to record payment."); }
            finally { setPaymentSaving(false); }
          }}>{paymentSaving ? "Recording…" : "Record Payment"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
