import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IndianRupee, Printer, Receipt, ShoppingBag, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KhataSaleDialog } from "@/components/khata/KhataSaleDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { formatCurrency, formatDate, shopStore, useShopStore } from "@/lib/shop-store";
import { shopInfo } from "@/data/storefront";
import { useI18n } from "@/lib/i18n";
import type { Order, OrderStatus } from "@/types/operations";

export const Route = createFileRoute("/admin/sales")({
  head: () => ({ meta: [
    { title: "Orders & Sales — Admin" },
    { name: "description", content: "Track online orders, counter sales, invoices and delivery status." },
    { name: "robots", content: "noindex" },
  ] }),
  component: SalesPage,
});

const orderStatuses: OrderStatus[] = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"];

function SalesPage() {
  const { t } = useI18n();
  const orders = useShopStore((s) => s.orders);
  const [channel, setChannel] = useState<"all" | "online" | "offline">("all");
  const [status, setStatus] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Order | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<Order | null>(null);

  const filtered = useMemo(() => orders.filter((order) => {
    const matchesChannel = channel === "all" || order.channel === channel;
    const matchesStatus = status === "all" || order.orderStatus === status;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || order.code.toLowerCase().includes(q) || order.customerName.toLowerCase().includes(q) || order.village.toLowerCase().includes(q);
    return matchesChannel && matchesStatus && matchesQuery;
  }), [orders, channel, status, query]);

  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const collected = orders.reduce((sum, o) => sum + o.paid, 0);
  const pendingDeliveries = orders.filter((o) => o.deliveryStatus === "scheduled" || o.deliveryStatus === "out-for-delivery").length;

  return <div className="space-y-6">
    <ModulePageHeader
      crumbs={[{ label: t("common.admin"), to: "/admin" }, { label: t("common.ordersSales") }]}
      eyebrow={t("common.operations")}
      title={t("sales.title")}
      description={t("sales.description")}
      actions={<div className="flex flex-wrap items-center gap-2"><KhataSaleDialog trigger={<Button className="rounded-full"><ShoppingBag className="size-4" />New Khata Sale</Button>} /><ExportMenu /></div>}
    />

    <SummaryCards items={[
      { label: t("sales.orderValue"), value: formatCurrency(revenue), icon: IndianRupee },
      { label: t("sales.paymentsCollected"), value: formatCurrency(collected), icon: Receipt, tone: "success" },
      { label: t("sales.outstanding"), value: formatCurrency(revenue - collected), icon: IndianRupee, tone: "warning" },
      { label: t("sales.pendingDeliveries"), value: String(pendingDeliveries), icon: Truck, tone: "default" },
    ]} />

    <Tabs value={channel} onValueChange={(value) => setChannel(value as typeof channel)}><TabsList><TabsTrigger value="all">{t("sales.all")}</TabsTrigger><TabsTrigger value="online">{t("sales.onlineOrders")}</TabsTrigger><TabsTrigger value="offline">{t("sales.offlineCounter")}</TabsTrigger></TabsList></Tabs>

    <SearchToolbar value={query} onChange={setQuery} placeholder={t("sales.placeholder")}>
      <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44 rounded-full"><SelectValue placeholder={t("sales.statusPlaceholder")} /></SelectTrigger><SelectContent><SelectItem value="all">{t("sales.allStatuses")}</SelectItem>{orderStatuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select>
    </SearchToolbar>

    {filtered.length === 0 ? <EmptyState icon={ShoppingBag} title={t("sales.noOrders")} description={t("sales.noOrdersDescription")} /> : <Card className="shadow-soft"><CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead>{t("sales.order")}</TableHead><TableHead>{t("sales.customer")}</TableHead><TableHead className="text-right">{t("sales.items")}</TableHead><TableHead className="text-right">{t("sales.amount")}</TableHead><TableHead>{t("sales.payment")}</TableHead><TableHead>{t("sales.delivery")}</TableHead><TableHead>{t("sales.status")}</TableHead><TableHead className="text-right">{t("sales.actions")}</TableHead></TableRow></TableHeader><TableBody>{filtered.map((order) => <TableRow key={order.id}>
      <TableCell><p className="font-semibold">{order.code}</p><p className="text-xs text-muted-foreground">{formatDate(order.placedOn)}</p></TableCell>
      <TableCell><p className="font-medium">{order.customerName}</p><p className="text-xs text-muted-foreground">{order.village} · {order.customerType}</p></TableCell>
      <TableCell className="text-right">{order.items.length}</TableCell><TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell><TableCell><StatusBadge status={order.paymentStatus} /></TableCell><TableCell className="text-xs capitalize text-muted-foreground">{order.deliveryStatus.replace(/-/g, " ")}</TableCell><TableCell><Badge variant="outline" className="rounded-full capitalize">{order.orderStatus}</Badge></TableCell>
      <TableCell className="text-right"><div className="flex justify-end gap-1.5"><Button size="sm" variant="outline" className="rounded-full" onClick={() => setActive(order)}>{t("sales.view")}</Button><Button size="sm" variant="ghost" className="rounded-full" onClick={() => setInvoiceFor(order)}>{t("sales.invoice")}</Button></div></TableCell>
    </TableRow>)}</TableBody></Table></CardContent></Card>}

    <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">{active ? <><DialogHeader><DialogTitle>{active.code}</DialogTitle><DialogDescription>{active.customerName} · {active.village} · {formatDate(active.placedOn)}</DialogDescription></DialogHeader><div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3">{orderStatuses.slice(0, 5).map((s) => <Button key={s} size="sm" variant={active.orderStatus === s ? "default" : "outline"} className="rounded-full capitalize" onClick={() => { shopStore.updateOrder(active.id, { orderStatus: s }); setActive({ ...active, orderStatus: s }); }}>{s}</Button>)}</div>
      <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{active.items.map((line) => <TableRow key={line.id}><TableCell>{line.product}</TableCell><TableCell className="text-right">{line.quantity} {line.unit}</TableCell><TableCell className="text-right">{formatCurrency(line.rate)}</TableCell><TableCell className="text-right">{formatCurrency(line.amount)}</TableCell></TableRow>)}</TableBody></Table>
      <div className="grid gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm"><Row label="Subtotal" value={formatCurrency(active.subtotal)} /><Row label="Discount" value={`- ${formatCurrency(active.discount)}`} /><Row label="Tax" value={formatCurrency(active.tax)} /><Row label="Total" value={formatCurrency(active.total)} bold /><Row label="Paid" value={formatCurrency(active.paid)} /><Row label="Balance" value={formatCurrency(active.total - active.paid)} bold /></div>
      <div><p className="mb-3 text-sm font-semibold">Order timeline</p><Timeline items={active.timeline.map((event) => ({ id: event.id, title: event.label, meta: formatDate(event.at), ...(event.note ? { description: event.note } : {}) }))} /></div>
      <Button variant="outline" className="w-full rounded-full" onClick={() => { setInvoiceFor(active); setActive(null); }}><Printer className="size-4" /> Invoice preview</Button>
    </div></> : null}</DialogContent></Dialog>

    <Dialog open={!!invoiceFor} onOpenChange={(open) => !open && setInvoiceFor(null)}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl print:fixed print:inset-0 print:m-0 print:h-auto print:max-h-none print:w-full print:max-w-none print:overflow-visible print:border-0 print:bg-white print:p-0 print:shadow-none">{invoiceFor ? <>
      <DialogHeader className="print:hidden"><DialogTitle>Tax invoice {invoiceFor.code}</DialogTitle><DialogDescription>Generated from the recorded order. Use Print / Save as PDF to create the invoice copy.</DialogDescription></DialogHeader>
      <InvoiceDocument order={invoiceFor} />
      <div className="flex gap-2 print:hidden"><Button className="flex-1 rounded-full" onClick={() => window.print()}><Printer className="size-4" /> Print / Save as PDF</Button><Button variant="outline" className="rounded-full" onClick={() => setInvoiceFor(null)}>Close</Button></div>
    </> : null}</DialogContent></Dialog>
  </div>;
}

function InvoiceDocument({ order }: { order: Order }) {
  const balance = Math.max(order.total - order.paid, 0);
  const status = balance === 0 ? "PAID" : order.paid > 0 ? "PARTIALLY PAID" : "UNPAID";
  return <article className="mx-auto w-full max-w-[820px] bg-white p-6 text-slate-900 sm:p-10 print:max-w-none print:p-10">
    <div className="flex flex-wrap justify-between gap-6 border-b border-slate-200 pb-6"><div><p className="text-2xl font-bold">{shopInfo.name}</p><p className="mt-1 text-sm text-slate-500">{shopInfo.address}</p><p className="text-sm text-slate-500">Phone: {shopInfo.phone} · {shopInfo.email}</p></div><div className="text-right"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tax Invoice</p><p className="mt-2 text-lg font-bold">{order.code}</p><p className="text-sm text-slate-500">Date: {formatDate(order.placedOn)}</p><span className="mt-2 inline-block rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold">{status}</span></div></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</p><p className="mt-2 font-semibold">{order.customerName}</p><p className="text-sm text-slate-500">{order.village}</p><p className="text-sm text-slate-500">{order.mobile}</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order details</p><p className="mt-2 text-sm">Channel: <strong className="capitalize">{order.channel}</strong></p><p className="text-sm">Payment status: <strong className="capitalize">{order.paymentStatus}</strong></p><p className="text-sm">Order status: <strong className="capitalize">{order.orderStatus}</strong></p></div></div>
    <table className="mt-8 w-full border-collapse text-sm"><thead><tr className="border-y border-slate-200"><th className="py-3 text-left">Item</th><th className="py-3 text-right">Qty</th><th className="py-3 text-right">Rate</th><th className="py-3 text-right">Amount</th></tr></thead><tbody>{order.items.map((line) => <tr key={line.id} className="border-b border-slate-100"><td className="py-3">{line.product}</td><td className="py-3 text-right">{line.quantity} {line.unit}</td><td className="py-3 text-right">{formatCurrency(line.rate)}</td><td className="py-3 text-right font-medium">{formatCurrency(line.amount)}</td></tr>)}</tbody></table>
    <div className="ml-auto mt-6 w-full max-w-sm space-y-2 text-sm"><Row label="Subtotal" value={formatCurrency(order.subtotal)} /><Row label="Discount" value={`- ${formatCurrency(order.discount)}`} /><Row label="Tax" value={formatCurrency(order.tax)} /><div className="border-t border-slate-200 pt-2"><Row label="Total" value={formatCurrency(order.total)} bold /></div><Row label="Paid" value={formatCurrency(order.paid)} /><Row label="Balance due" value={formatCurrency(balance)} bold /></div>
    <div className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500"><p>Thank you for your business.</p><p className="mt-1">This invoice is generated from the recorded order. Choose “Save as PDF” in the print dialog to save a PDF copy.</p></div>
  </article>;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) { return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span className={bold ? "font-display font-semibold" : ""}>{value}</span></div>; }
