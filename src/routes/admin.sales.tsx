import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IndianRupee, Printer, Receipt, ShoppingBag, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KhataSaleDialog } from "@/components/khata/KhataSaleDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { Timeline } from "@/components/shared/Timeline";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatCurrency, formatDate, shopStore, useShopStore } from "@/lib/shop-store";
import { useI18n } from "@/lib/i18n";
import type { Order, OrderStatus } from "@/types/operations";

export const Route = createFileRoute("/admin/sales")({
  head: () => ({
    meta: [
      { title: "Orders & Sales — Admin" },
      {
        name: "description",
        content: "Track online orders, counter sales, invoices and delivery status.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SalesPage,
});

const orderStatuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

function SalesPage() {
  const { t } = useI18n();
  const orders = useShopStore((s) => s.orders);
  const [channel, setChannel] = useState<"all" | "online" | "offline">("all");
  const [status, setStatus] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Order | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<Order | null>(null);

  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        const matchesChannel = channel === "all" || order.channel === channel;
        const matchesStatus = status === "all" || order.orderStatus === status;
        const q = query.trim().toLowerCase();
        const matchesQuery =
          !q ||
          order.code.toLowerCase().includes(q) ||
          order.customerName.toLowerCase().includes(q) ||
          order.village.toLowerCase().includes(q);
        return matchesChannel && matchesStatus && matchesQuery;
      }),
    [orders, channel, status, query],
  );

  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const collected = orders.reduce((sum, o) => sum + o.paid, 0);
  const pendingDeliveries = orders.filter(
    (o) => o.deliveryStatus === "scheduled" || o.deliveryStatus === "out-for-delivery",
  ).length;

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: t("common.admin"), to: "/admin" }, { label: t("common.ordersSales") }]}
        eyebrow={t("common.operations")}
        title={t("sales.title")}
        description={t("sales.description")}
       actions={
  <div className="flex flex-wrap items-center gap-2">
    <KhataSaleDialog
      trigger={
        <Button className="rounded-full">
          <ShoppingBag className="size-4" />
          New Khata Sale
        </Button>
      }
    />

    <ExportMenu />
  </div>
}            
      />

      <SummaryCards
        items={[
          { label: t("sales.orderValue"), value: formatCurrency(revenue), icon: IndianRupee },
          {
            label: t("sales.paymentsCollected"),
            value: formatCurrency(collected),
            icon: Receipt,
            tone: "success",
          },
          {
            label: t("sales.outstanding"),
            value: formatCurrency(revenue - collected),
            icon: IndianRupee,
            tone: "warning",
          },
          {
            label: t("sales.pendingDeliveries"),
            value: String(pendingDeliveries),
            icon: Truck,
            tone: "default",
          },
        ]}
      />

      <Tabs value={channel} onValueChange={(value) => setChannel(value as typeof channel)}>
        <TabsList>
          <TabsTrigger value="all">{t("sales.all")}</TabsTrigger>
          <TabsTrigger value="online">{t("sales.onlineOrders")}</TabsTrigger>
          <TabsTrigger value="offline">{t("sales.offlineCounter")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <SearchToolbar
        value={query}
        onChange={setQuery}
        placeholder={t("sales.placeholder")}
      >
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44 rounded-full">
            <SelectValue placeholder={t("sales.statusPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("sales.allStatuses")}</SelectItem>
            {orderStatuses.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SearchToolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={t("sales.noOrders")}
          description={t("sales.noOrdersDescription")}
        />
      ) : (
        <Card className="shadow-soft">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sales.order")}</TableHead>
                  <TableHead>{t("sales.customer")}</TableHead>
                  <TableHead className="text-right">{t("sales.items")}</TableHead>
                  <TableHead className="text-right">{t("sales.amount")}</TableHead>
                  <TableHead>{t("sales.payment")}</TableHead>
                  <TableHead>{t("sales.delivery")}</TableHead>
                  <TableHead>{t("sales.status")}</TableHead>
                  <TableHead className="text-right">{t("sales.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <p className="font-semibold">{order.code}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.placedOn)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.village} · {order.customerType}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">{order.items.length}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.paymentStatus} />
                    </TableCell>
                    <TableCell className="text-xs capitalize text-muted-foreground">
                      {order.deliveryStatus.replace(/-/g, " ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full capitalize">
                        {order.orderStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => setActive(order)}
                        >
                          {t("sales.view")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => setInvoiceFor(order)}
                        >
                          {t("sales.invoice")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {active ? (
            <>
              <DialogHeader>
                <DialogTitle>{active.code}</DialogTitle>
                <DialogDescription>
                  {active.customerName} · {active.village} · {formatDate(active.placedOn)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid gap-2 sm:grid-cols-3">
                  {orderStatuses.slice(0, 5).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={active.orderStatus === s ? "default" : "outline"}
                      className="rounded-full capitalize"
                      onClick={() => {
                        shopStore.updateOrder(active.id, { orderStatus: s });
                        setActive({ ...active, orderStatus: s });
                      }}
                    >
                      {s}
                    </Button>
                  ))}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active.items.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.product}</TableCell>
                        <TableCell className="text-right">
                          {line.quantity} {line.unit}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(line.rate)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="grid gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
                  <Row label="Subtotal" value={formatCurrency(active.subtotal)} />
                  <Row label="Discount" value={`- ${formatCurrency(active.discount)}`} />
                  <Row label="Tax" value={formatCurrency(active.tax)} />
                  <Row label="Total" value={formatCurrency(active.total)} bold />
                  <Row label="Paid" value={formatCurrency(active.paid)} />
                  <Row label="Balance" value={formatCurrency(active.total - active.paid)} bold />
                </div>

                <div>
                  <p className="mb-3 text-sm font-semibold">Order timeline</p>
                  <Timeline
                    items={active.timeline.map((event) => ({
                      id: event.id,
                      title: event.label,
                      meta: formatDate(event.at),
                      ...(event.note ? { description: event.note } : {}),
                    }))}
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={() => {
                    setInvoiceFor(active);
                    setActive(null);
                  }}
                >
                  <Printer className="size-4" /> Invoice preview
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!invoiceFor} onOpenChange={(open) => !open && setInvoiceFor(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {invoiceFor ? (
            <>
              <DialogHeader>
                <DialogTitle>Tax invoice {invoiceFor.code}</DialogTitle>
                <DialogDescription>
                  PDF generation is enabled once the backend is connected.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 rounded-xl border border-border p-5 text-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold">Your shop</p>
                    <p className="text-xs text-muted-foreground">GSTIN 06ABCDE1234F1Z5</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Invoice: {invoiceFor.code}</p>
                    <p>Date: {formatDate(invoiceFor.placedOn)}</p>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-xs">
                  <p className="font-semibold text-foreground">{invoiceFor.customerName}</p>
                  <p>
                    {invoiceFor.village} · {invoiceFor.mobile}
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceFor.items.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.product}</TableCell>
                        <TableCell className="text-right">
                          {line.quantity} {line.unit}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(line.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Row label="Total payable" value={formatCurrency(invoiceFor.total)} bold />
              </div>
              <Button className="rounded-full" onClick={() => window.print()}>
                <Printer className="size-4" /> Print
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-display font-semibold" : ""}>{value}</span>
    </div>
  );
}
