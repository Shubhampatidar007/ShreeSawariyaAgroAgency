import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, IndianRupee, ReceiptText, ShoppingBag, Truck, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatCurrency, formatDate, useShopStore } from "@/lib/shop-store";
import type { Order, OrderStatus, PaymentRecord } from "@/types/operations";

export const Route = createFileRoute("/admin/sales")({
  head: () => ({ meta: [{ title: "Orders & Sales — Admin" }, { name: "description", content: "Track orders, sales and received payments." }, { name: "robots", content: "noindex" }] }),
  component: SalesPage,
});

const orderStatuses: OrderStatus[] = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"];

function SalesPage() {
  const orders = useShopStore((s) => s.orders);
  const storedPayments = useShopStore((s) => s.payments);
  const [payments, setPayments] = useState<PaymentRecord[]>(storedPayments);
  const [channel, setChannel] = useState<"all" | "online" | "offline">("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => setPayments(storedPayments), [storedPayments]);

  const filtered = useMemo(() => orders.filter((order) => {
    const q = query.trim().toLowerCase();
    return (channel === "all" || order.channel === channel) &&
      (status === "all" || order.orderStatus === status) &&
      (!q || order.code.toLowerCase().includes(q) || order.customerName.toLowerCase().includes(q) || order.village.toLowerCase().includes(q));
  }), [orders, channel, status, query]);

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const collected = orders.reduce((sum, order) => sum + order.paid, 0);
  const pendingDeliveries = orders.filter((order) => order.deliveryStatus === "scheduled" || order.deliveryStatus === "out-for-delivery").length;
  const received = payments.filter((p) => p.direction === "incoming" && p.status === "success");
  const receivedTotal = received.reduce((sum, p) => sum + p.amount, 0);

  const openPayment = (order?: Order) => { setPaymentOrder(order ?? null); setPaymentOpen(true); };
  const savePayment = (payment: PaymentRecord) => { setPayments((current) => [payment, ...current]); setPaymentOpen(false); setPaymentOrder(null); toast.success("Payment record added."); };

  return <div className="space-y-6">
    <ModulePageHeader
      crumbs={[{ label: "Admin", to: "/admin" }, { label: "Orders & Sales" }]}
      eyebrow="Operations"
      title="Orders & sales"
      description="Manage customer orders and record every payment received."
      actions={<div className="flex gap-2"><Button className="rounded-full" onClick={() => openPayment()}><WalletCards className="size-4" />Record payment</Button><ExportMenu /></div>}
    />

    <SummaryCards items={[
      { label: "Order value", value: formatCurrency(revenue), icon: IndianRupee },
      { label: "Payments collected", value: formatCurrency(collected), icon: WalletCards, tone: "success" },
      { label: "Outstanding", value: formatCurrency(revenue - collected), icon: IndianRupee, tone: "warning" },
      { label: "Pending deliveries", value: String(pendingDeliveries), icon: Truck },
    ]} />

    <Tabs value={channel} onValueChange={(value) => setChannel(value as typeof channel)}><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="online">Online orders</TabsTrigger><TabsTrigger value="offline">Offline counter</TabsTrigger></TabsList></Tabs>

    <SearchToolbar value={query} onChange={setQuery} placeholder="Search order, customer or village">
      <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44 rounded-full"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{orderStatuses.map((value) => <SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent></Select>
    </SearchToolbar>

    {filtered.length === 0 ? <EmptyState icon={ShoppingBag} title="No orders" description="No sales match the current filters." /> : <Card className="shadow-soft"><CardHeader><CardTitle className="text-base">Orders</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Payment</TableHead><TableHead>Delivery</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filtered.map((order) => <TableRow key={order.id}><TableCell><p className="font-semibold">{order.code}</p><p className="text-xs text-muted-foreground">{formatDate(order.placedOn)}</p></TableCell><TableCell><p className="font-medium">{order.customerName}</p><p className="text-xs text-muted-foreground">{order.village} · {order.customerType}</p></TableCell><TableCell className="text-right">{order.items.length}</TableCell><TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell><TableCell><StatusBadge status={order.paymentStatus} /></TableCell><TableCell className="text-xs capitalize text-muted-foreground">{order.deliveryStatus.replace(/-/g, " ")}</TableCell><TableCell><Badge variant="outline" className="rounded-full capitalize">{order.orderStatus}</Badge></TableCell><TableCell className="text-right"><Button size="sm" variant="outline" className="rounded-full" onClick={() => openPayment(order)}>Payment</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}

    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Payment records</CardTitle><p className="mt-1 text-sm text-muted-foreground">A separate record of money actually received: date, amount, method, reference and order.</p></div><Button className="rounded-full" onClick={() => openPayment()}><ReceiptText className="size-4" />Record payment</Button></CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-3"><MiniStat icon={WalletCards} label="Received" value={formatCurrency(receivedTotal)} /><MiniStat icon={ReceiptText} label="Entries" value={String(received.length)} /><MiniStat icon={CalendarDays} label="Latest payment" value={received[0] ? formatDate(received[0].date) : "—"} /></div>
        {received.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center"><WalletCards className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="font-medium">No payment records yet</p><p className="mt-1 text-sm text-muted-foreground">Record a payment here when money is received.</p></div> : <div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Order</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{received.map((payment) => <TableRow key={payment.id}><TableCell>{formatDate(payment.date)}</TableCell><TableCell className="font-medium">{payment.partyName || "—"}</TableCell><TableCell>{payment.orderCode || "—"}</TableCell><TableCell className="capitalize">{payment.method}</TableCell><TableCell className="font-mono text-xs">{payment.reference || "—"}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(payment.amount)}</TableCell><TableCell><Badge variant="outline" className="rounded-full capitalize">{payment.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div>}
      </CardContent>
    </Card>

    <PaymentRecordDialog open={paymentOpen} order={paymentOrder} onOpenChange={(open) => { setPaymentOpen(open); if (!open) setPaymentOrder(null); }} onRecorded={savePayment} />
  </div>;
}

function PaymentRecordDialog({ open, order, onOpenChange, onRecorded }: { open: boolean; order: Order | null; onOpenChange: (open: boolean) => void; onRecorded: (payment: PaymentRecord) => void }) {
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentRecord["method"]>("cash");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => { if (!open) return; setDate(new Date().toISOString().slice(0, 10)); setAmount(order ? String(Math.max(order.total - order.paid, 0)) : ""); setMethod("cash"); setReference(""); setRemarks(""); }, [open, order]);

  const save = () => {
    const value = Number(amount);
    if (!date || !Number.isFinite(value) || value <= 0) return toast.error("Enter a valid payment date and amount.");
    onRecorded({ id: crypto.randomUUID(), reference: reference.trim() || `PAY-${Date.now()}`, direction: "incoming", partyId: order?.customerId ?? "", partyName: order?.customerName ?? "Customer payment", date, amount: value, method, status: "success", orderCode: order?.code, remarks: remarks.trim() || undefined });
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Record payment received</DialogTitle><DialogDescription>UI only for now. This creates a local payment record on the page; database wiring comes next.</DialogDescription></DialogHeader><div className="grid gap-4">
    {order && <div className="rounded-xl border bg-muted/40 p-4"><p className="font-semibold">{order.code}</p><p className="text-sm text-muted-foreground">{order.customerName}</p><div className="mt-3 grid grid-cols-3 gap-3"><MiniStat label="Total" value={formatCurrency(order.total)} /><MiniStat label="Paid" value={formatCurrency(order.paid)} /><MiniStat label="Balance" value={formatCurrency(Math.max(order.total - order.paid, 0))} /></div></div>}
    <div className="grid gap-2 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="payment-date">Payment date</Label><Input id="payment-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div><div className="grid gap-2"><Label htmlFor="payment-amount">Amount received</Label><Input id="payment-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₹ 0.00" /></div></div>
    <div className="grid gap-2"><Label>Payment method</Label><Select value={method} onValueChange={(value) => setMethod(value as PaymentRecord["method"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="bank">Bank transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="online">Online</SelectItem></SelectContent></Select></div>
    <div className="grid gap-2"><Label htmlFor="payment-reference">Reference / transaction ID</Label><Input id="payment-reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI / bank / receipt reference" /></div>
    <div className="grid gap-2"><Label htmlFor="payment-remarks">Remarks</Label><Input id="payment-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional note" /></div>
  </div><DialogFooter><Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>Cancel</Button><Button className="rounded-full" onClick={save}><ReceiptText className="size-4" />Save payment record</Button></DialogFooter></DialogContent></Dialog>;
}

function MiniStat({ icon: Icon, label, value }: { icon?: typeof WalletCards; label: string; value: string }) { return <div>{Icon ? <Icon className="mb-1 size-4 text-muted-foreground" /> : null}<p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div>; }
