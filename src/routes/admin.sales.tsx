import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IndianRupee, ShoppingBag, Truck, Send, History, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { Timeline } from "@/components/shared/Timeline";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { EmptyState } from "@/components/admin/EmptyState";
import { KhataSaleDialog } from "@/components/khata/KhataSaleDialog";
import { formatCurrency, formatDate, shopStore, useShopStore } from "@/lib/shop-store";
import { sendWhatsAppBatch, type WhatsAppMessageKind } from "@/lib/whatsapp";
import type { Order, OrderStatus } from "@/types/operations";
import type { CustomerLedgerEntry, CustomerSaleItem } from "@/types/business";

export const Route = createFileRoute("/admin/sales")({
  head: () => ({ meta: [{ title: "Orders & Sales — Admin" }, { name: "description", content: "Track sales and share customer purchase records after a khata sale." }, { name: "robots", content: "noindex" }] }),
  component: SalesPage,
});

const orderStatuses: OrderStatus[] = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"];

function SalesPage() {
  const orders = useShopStore((s) => s.orders);
  const ledger = useShopStore((s) => s.customerLedger);
  const [channel, setChannel] = useState<"all" | "online" | "offline">("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Order | null>(null);
  const [shareTransactionId, setShareTransactionId] = useState<string | null>(null);

  const filtered = useMemo(() => orders.filter((order) => {
    const matchesChannel = channel === "all" || order.channel === channel;
    const matchesStatus = status === "all" || order.orderStatus === status;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || order.code.toLowerCase().includes(q) || order.customerName.toLowerCase().includes(q) || order.village.toLowerCase().includes(q);
    return matchesChannel && matchesStatus && matchesQuery;
  }), [orders, channel, status, query]);

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const collected = orders.reduce((sum, order) => sum + order.paid, 0);
  const pendingDeliveries = orders.filter((order) => order.deliveryStatus === "scheduled" || order.deliveryStatus === "out-for-delivery").length;
  const shareEntry = ledger.find((entry) => entry.id === shareTransactionId) ?? null;

  return (
    <div className="space-y-6">
      <ModulePageHeader crumbs={[{ label: "Admin", to: "/admin" }, { label: "Orders & Sales" }]} eyebrow="Operations" title="Orders & sales" description="Record sales in khata. After a customer purchase is saved, choose exactly what customer record should be shared." actions={<div className="flex flex-wrap items-center gap-2"><KhataSaleDialog trigger={<Button className="rounded-full"><ShoppingBag className="size-4" />New Khata Sale</Button>} onCreated={setShareTransactionId} /><ExportMenu /></div>} />
      <SummaryCards items={[{ label: "Order value", value: formatCurrency(revenue), icon: IndianRupee }, { label: "Payments collected", value: formatCurrency(collected), icon: WalletCards, tone: "success" }, { label: "Outstanding", value: formatCurrency(revenue - collected), icon: IndianRupee, tone: "warning" }, { label: "Pending deliveries", value: String(pendingDeliveries), icon: Truck }]} />
      <Tabs value={channel} onValueChange={(value) => setChannel(value as typeof channel)}><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="online">Online orders</TabsTrigger><TabsTrigger value="offline">Offline counter</TabsTrigger></TabsList></Tabs>
      <SearchToolbar value={query} onChange={setQuery} placeholder="Search order, customer or village"><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44 rounded-full"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{orderStatuses.map((value) => <SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent></Select></SearchToolbar>
      {filtered.length === 0 ? <EmptyState icon={ShoppingBag} title="No orders" description="No sales match the current filters." /> : <Card className="shadow-soft"><CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Payment</TableHead><TableHead>Delivery</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filtered.map((order) => <TableRow key={order.id}><TableCell><p className="font-semibold">{order.code}</p><p className="text-xs text-muted-foreground">{formatDate(order.placedOn)}</p></TableCell><TableCell><p className="font-medium">{order.customerName}</p><p className="text-xs text-muted-foreground">{order.village} · {order.customerType}</p></TableCell><TableCell className="text-right">{order.items.length}</TableCell><TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell><TableCell><StatusBadge status={order.paymentStatus} /></TableCell><TableCell className="text-xs capitalize text-muted-foreground">{order.deliveryStatus.replace(/-/g, " ")}</TableCell><TableCell><Badge variant="outline" className="rounded-full capitalize">{order.orderStatus}</Badge></TableCell><TableCell className="text-right"><Button size="sm" variant="outline" className="rounded-full" onClick={() => setActive(order)}>View</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">{active ? <><DialogHeader><DialogTitle>{active.code}</DialogTitle><DialogDescription>{active.customerName} · {active.village} · {formatDate(active.placedOn)}</DialogDescription></DialogHeader><div className="space-y-5"><div className="grid gap-2 sm:grid-cols-5">{orderStatuses.slice(0, 5).map((value) => <Button key={value} size="sm" variant={active.orderStatus === value ? "default" : "outline"} className="rounded-full capitalize" onClick={() => { void shopStore.updateOrder(active.id, { orderStatus: value }); setActive({ ...active, orderStatus: value }); }}>{value}</Button>)}</div><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{active.items.map((line) => <TableRow key={line.id}><TableCell>{line.product}</TableCell><TableCell className="text-right">{line.quantity} {line.unit}</TableCell><TableCell className="text-right">{formatCurrency(line.rate)}</TableCell><TableCell className="text-right">{formatCurrency(line.amount)}</TableCell></TableRow>)}</TableBody></Table><div className="grid gap-2 rounded-xl border bg-muted/40 p-4 text-sm"><Row label="Subtotal" value={formatCurrency(active.subtotal)} /><Row label="Discount" value={`- ${formatCurrency(active.discount)}`} /><Row label="Tax" value={formatCurrency(active.tax)} /><Row label="Total" value={formatCurrency(active.total)} bold /><Row label="Paid" value={formatCurrency(active.paid)} /><Row label="Balance" value={formatCurrency(active.total - active.paid)} bold /></div><Timeline items={active.timeline.map((event) => ({ id: event.id, title: event.label, meta: formatDate(event.at), ...(event.note ? { description: event.note } : {}) }))} /></div></> : null}</DialogContent></Dialog>
      <SaleShareDialog entry={shareEntry} ledger={ledger} onClose={() => setShareTransactionId(null)} />
    </div>
  );
}

function SaleShareDialog({ entry, ledger, onClose }: { entry: CustomerLedgerEntry | null; ledger: CustomerLedgerEntry[]; onClose: () => void }) {
  const customers = useShopStore((s) => s.customers);
  const customer = entry ? customers.find((item) => item.id === entry.customerId) ?? null : null;
  const [kind, setKind] = useState<WhatsAppMessageKind>("purchase-summary");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<CustomerSaleItem[]>([]);
  const [sending, setSending] = useState(false);

  const customerRecords = useMemo(() => customer ? ledger.filter((record) => record.customerId === customer.id).sort((a, b) => b.date.localeCompare(a.date)) : [], [customer, ledger]);

  useEffect(() => {
    let alive = true;
    setItems([]);
    if (!entry || !customer) return;
    void shopStore.fetchTransactionItems(entry.id).then((next) => { if (alive) setItems(next); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [entry?.id, customer?.id]);

  useEffect(() => {
    if (!entry || !customer) return;
    setMessage(buildShareMessage(kind, customer, entry, customerRecords, items));
  }, [entry?.id, customer?.id, kind, customerRecords, items]);

  if (!entry || !customer) return null;

  const send = async () => {
    if (!customer.mobile?.trim()) return toast.error("This customer does not have a mobile number.");
    setSending(true);
    try {
      const response = await sendWhatsAppBatch({ kind, recipients: [{ id: customer.id, name: customer.name, mobile: customer.mobile, due: customer.currentDue, village: customer.village, lastPurchase: customer.lastPurchase }], message });
      if (!response.ok) throw new Error(response.note || "WhatsApp delivery failed.");
      toast.success("Customer record sent through WhatsApp.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "WhatsApp delivery failed.");
    } finally { setSending(false); }
  };

  return <Dialog open={Boolean(entry)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Share purchase record?</DialogTitle><DialogDescription>{customer.name} · {formatDate(entry.date)} · Sale {formatCurrency(entry.amount)}</DialogDescription></DialogHeader>
    <div className="grid gap-3 md:grid-cols-2"><Card className={kind === "purchase-summary" ? "border-primary" : ""}><CardContent className="p-4"><Button variant={kind === "purchase-summary" ? "default" : "outline"} className="w-full rounded-full" onClick={() => setKind("purchase-summary")}><History className="size-4" />Complete purchase record</Button><p className="mt-2 text-xs text-muted-foreground">Current sale + total purchases + old payment status + current due.</p></CardContent></Card><Card className={kind === "custom" ? "border-primary" : ""}><CardContent className="p-4"><Button variant={kind === "custom" ? "default" : "outline"} className="w-full rounded-full" onClick={() => setKind("custom")}><Send className="size-4" />Custom share</Button><p className="mt-2 text-xs text-muted-foreground">Edit the record message before sending.</p></CardContent></Card></div>
    <div className="rounded-xl border p-4"><div className="grid gap-3 sm:grid-cols-4"><Summary label="Current sale" value={formatCurrency(entry.amount)} /><Summary label="Paid / advance" value={formatCurrency(entry.payment)} /><Summary label="That-day due" value={formatCurrency(entry.remainingDue)} /><Summary label="Current due" value={formatCurrency(customer.currentDue)} /></div><div className="mt-4 space-y-2">{items.length ? items.map((item) => <div key={item.id} className="flex justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"><span>{item.product} · {item.quantity} {item.unit} × {formatCurrency(item.rate)}</span><span className="font-semibold">{formatCurrency(item.amount)}</span></div>) : <p className="text-sm">{entry.product}</p>}</div></div>
    <div className="rounded-xl border p-4"><p className="mb-2 text-sm font-semibold">Edit before sending</p><Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-44" /><div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-wrap leading-6">{message}</div></div>
    <DialogFooter><Button variant="outline" className="rounded-full" onClick={onClose}>Not now</Button><Button className="rounded-full" disabled={sending} onClick={() => void send()}><Send className="size-4" />{sending ? "Sending…" : "Edit & send"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function buildShareMessage(kind: WhatsAppMessageKind, customer: { name: string; totalPurchases: number; totalPaid: number; currentDue: number }, current: CustomerLedgerEntry, records: CustomerLedgerEntry[], items: CustomerSaleItem[]) {
  const itemLines = items.length ? items.map((item) => `• ${item.product} — ${item.quantity} ${item.unit} × ${formatCurrency(item.rate)} = ${formatCurrency(item.amount)}`).join("\n") : `• ${current.product}`;
  if (kind === "custom") return `Hello ${customer.name},\n\nYour purchase record is below.\n\n${itemLines}\n\nEdit this message before sending.\n\n— Shree Sawariya Agro Agency`;
  const history = records.slice(0, 10).map((record) => `• ${formatDate(record.date)} — ${record.entryType === "purchase" ? record.product : "Payment"} | amount ${formatCurrency(record.amount)} | paid ${formatCurrency(record.payment)} | due ${formatCurrency(record.remainingDue)}`).join("\n");
  return `Hello ${customer.name},\n\nHere is your purchase record from Shree Sawariya Agro Agency.\n\nCURRENT SALE\nDate: ${formatDate(current.date)}\n${itemLines}\nSale amount: ${formatCurrency(current.amount)}\nAdvance / paid: ${formatCurrency(current.payment)}\nThat-day due: ${formatCurrency(current.remainingDue)}\n\nACCOUNT SUMMARY\nTotal purchases: ${formatCurrency(customer.totalPurchases)}\nTotal paid: ${formatCurrency(customer.totalPaid)}\nCurrent due: ${formatCurrency(customer.currentDue)}\n\nPURCHASE / PAYMENT HISTORY\n${history || "No previous records."}\n\nThank you.`;
}

function Summary({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div>; }
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) { return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span className={bold ? "font-semibold" : ""}>{value}</span></div>; }
