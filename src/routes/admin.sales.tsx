import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  IndianRupee,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  ShoppingBag,
  Truck,
  UserRound,
  WalletCards,
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

import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { EmptyState } from "@/components/admin/EmptyState";
import { ExportMenu } from "@/components/shared/ExportMenu";

import {
  formatCurrency,
  formatDate,
  shopStore,
  useShopStore,
} from "@/lib/shop-store";
import { supabase } from "@/integrations/supabase/client";

import type { Order, OrderStatus } from "@/types/operations";

export const Route = createFileRoute("/admin/sales")({
  head: () => ({
    meta: [
      { title: "Orders & Sales — Admin" },
      {
        name: "description",
        content: "Manage online customer orders and payment delivery details.",
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
  const orders = useShopStore((s) => s.orders);
  const customers = useShopStore((s) => s.customers);

  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Order | null>(null);

  const onlineOrders = useMemo(
    () => orders.filter((order) => order.channel === "online"),
    [orders],
  );

  const filtered = useMemo(
    () =>
      onlineOrders.filter((order) => {
        const matchesStatus =
          status === "all" || order.orderStatus === status;

        const q = query.trim().toLowerCase();

        const customer = order.customerId
          ? customers.find((item) => item.id === order.customerId)
          : undefined;

        const matchesQuery =
          !q ||
          order.code.toLowerCase().includes(q) ||
          order.customerName.toLowerCase().includes(q) ||
          order.mobile.toLowerCase().includes(q) ||
          order.village.toLowerCase().includes(q) ||
          customer?.address?.toLowerCase().includes(q);

        return matchesStatus && matchesQuery;
      }),
    [onlineOrders, status, query, customers],
  );

  const revenue = onlineOrders.reduce(
    (sum, order) => sum + order.total,
    0,
  );

  const collected = onlineOrders.reduce(
    (sum, order) => sum + order.paid,
    0,
  );

  const outstanding = onlineOrders.reduce(
    (sum, order) => sum + Math.max(order.total - order.paid, 0),
    0,
  );

  const pendingDeliveries = onlineOrders.filter(
    (order) =>
      order.deliveryStatus === "scheduled" ||
      order.deliveryStatus === "out-for-delivery",
  ).length;

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Orders & Sales" },
        ]}
        eyebrow="Online operations"
        title="Orders & sales"
        description="Manage customers and orders that came through the online storefront."
        actions={<ExportMenu />}
      />

      <SummaryCards
        items={[
          {
            label: "Online order value",
            value: formatCurrency(revenue),
            icon: IndianRupee,
          },
          {
            label: "Advance collected",
            value: formatCurrency(collected),
            icon: WalletCards,
            tone: "success",
          },
          {
            label: "Remaining due",
            value: formatCurrency(outstanding),
            icon: IndianRupee,
            tone: "warning",
          },
          {
            label: "Pending deliveries",
            value: String(pendingDeliveries),
            icon: Truck,
          },
        ]}
      />

      <SearchToolbar
        value={query}
        onChange={setQuery}
        placeholder="Search order, customer, mobile or village"
      >
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44 rounded-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>

            {orderStatuses.map((value) => (
              <SelectItem
                key={value}
                value={value}
                className="capitalize"
              >
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SearchToolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No online orders"
          description="No online customer orders match the current filters."
        />
      ) : (
        <Card className="shadow-soft">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Advance</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((order) => {
                  const due = Math.max(order.total - order.paid, 0);

                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <p className="font-semibold">{order.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.placedOn)}
                        </p>
                      </TableCell>

                      <TableCell>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.mobile} · {order.village}
                        </p>
                      </TableCell>

                      <TableCell className="text-right">
                        {order.items.length}
                      </TableCell>

                      <TableCell className="text-right font-semibold">
                        {formatCurrency(order.total)}
                      </TableCell>

                      <TableCell>{formatCurrency(order.paid)}</TableCell>

                      <TableCell>{formatCurrency(due)}</TableCell>

                      <TableCell className="text-xs capitalize text-muted-foreground">
                        {order.deliveryStatus.replace(/-/g, " ")}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className="rounded-full capitalize"
                        >
                          {order.orderStatus}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => setActive(order)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <OrderViewDialog
        order={active}
        customers={customers}
        onClose={() => setActive(null)}
      />
    </div>
  );
}

function OrderViewDialog({
  order,
  customers,
  onClose,
}: {
  order: Order | null;
  customers: any[];
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [packageSentOn, setPackageSentOn] = useState("");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("pending");
  const [deliveryStatus, setDeliveryStatus] =
    useState<Order["deliveryStatus"]>("scheduled");
  const [remarks, setRemarks] = useState("");

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "upi" | "bank" | "card" | "online" | "cheque"
  >("upi");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentReceiptSending, setPaymentReceiptSending] = useState(false);

  const customer = order?.customerId
    ? customers.find((item) => item.id === order.customerId)
    : undefined;

  useEffect(() => {
    if (!order) return;

    setPackageSentOn(
      order.packageSentOn
        ? new Date(order.packageSentOn).toISOString().slice(0, 10)
        : "",
    );
    setOrderStatus(order.orderStatus);
    setDeliveryStatus(order.deliveryStatus);
    setRemarks(order.remarks ?? "");
  }, [order]);

  if (!order) return null;

  const due = Math.max(order.total - order.paid, 0);

  const savePayment = async (sendReceipt = false) => {
    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }

    if (amount > due) {
      toast.error(`Payment cannot exceed ${formatCurrency(due)}.`);
      return;
    }

    setPaymentSaving(true);
    if (sendReceipt) setPaymentReceiptSending(true);

    try {
      await shopStore.addOnlineOrderPayment({
        orderId: order.id,
        amount,
        method: paymentMethod,
        remarks: paymentRemarks,
      });

      if (sendReceipt) {
        const { error } = await supabase.functions.invoke(
          "payment-whatsapp-receipt",
          {
            body: { orderId: order.id },
          },
        );

        if (error) {
          toast.warning("Payment saved, but the WhatsApp receipt could not be sent.");
        } else {
          toast.success("Payment saved and receipt sent to the customer.");
        }
      } else {
        toast.success("Payment added successfully.");
      }

      setPaymentAmount("");
      setPaymentRemarks("");
      setPaymentDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to add payment.",
      );
    } finally {
      setPaymentSaving(false);
      setPaymentReceiptSending(false);
    }
  };

  const save = async () => {
    setSaving(true);

    try {
      await shopStore.updateOrder(order.id, {
        orderStatus,
        deliveryStatus,
        packageSentOn: packageSentOn
          ? new Date(`${packageSentOn}T00:00:00`).toISOString()
          : "",
        remarks,
      });

      toast.success("Order updated.");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update order.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={Boolean(order)}
        onOpenChange={(open) => !open && onClose()}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{order.code}</DialogTitle>
            <DialogDescription>
              Online order · {order.customerName} · {formatDate(order.placedOn)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserRound className="size-4 text-primary" />
                  Customer & Delivery Address
                </CardTitle>
              </CardHeader>

              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Info label="Name" value={order.customerName} />
                <Info label="Customer type" value={order.customerType} />
                <Info
                  label="Mobile"
                  value={order.mobile || customer?.mobile || "—"}
                  icon={<Phone className="size-3.5" />}
                />
                <Info
                  label="Village"
                  value={order.village || customer?.village || "—"}
                  icon={<MapPin className="size-3.5" />}
                />
                <Info
                  label="Delivery address"
                  value={order.deliveryAddress || customer?.address || "—"}
                />
                <Info label="Pincode" value={order.pincode || "—"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PackageCheck className="size-4 text-primary" />
                  Ordered products
                </CardTitle>
              </CardHeader>

              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.rate)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <WalletCards className="size-4 text-primary" />
                  Payment
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Info label="Order total" value={formatCurrency(order.total)} />
                  <Info label="Total paid" value={formatCurrency(order.paid)} />
                  <Info label="Remaining" value={formatCurrency(due)} />
                </div>

                {due === 0 ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Payment Completed
                  </div>
                ) : (
                  <Button
                    className="w-full rounded-full"
                    onClick={() => setPaymentDialogOpen(true)}
                  >
                    <WalletCards className="mr-2 size-4" />
                    Add Payment
                  </Button>
                )}

                <Info label="Initial payment method" value={order.paymentMethod} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="size-4 text-primary" />
                  Package & delivery
                </CardTitle>
              </CardHeader>

              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="package-sent-on">Package sent date</Label>
                  <Input
                    id="package-sent-on"
                    type="date"
                    value={packageSentOn}
                    onChange={(e) => setPackageSentOn(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Order status</Label>
                  <Select
                    value={orderStatus}
                    onValueChange={(value) => setOrderStatus(value as OrderStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orderStatuses.map((value) => (
                        <SelectItem key={value} value={value} className="capitalize">
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Delivery status</Label>
                  <Select
                    value={deliveryStatus}
                    onValueChange={(value) =>
                      setDeliveryStatus(value as Order["deliveryStatus"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not-required">Not required</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="out-for-delivery">Out for delivery</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Info
                  label="Current delivery status"
                  value={order.deliveryStatus.replace(/-/g, " ")}
                  icon={<CalendarDays className="size-3.5" />}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Other information</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                <Label htmlFor="order-remarks">Remarks / internal notes</Label>
                <Input
                  id="order-remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any additional order information..."
                />
              </CardContent>
            </Card>

            <div className="rounded-xl border bg-muted/40 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Remaining due</span>
                <span className="font-display text-xl font-semibold">
                  {formatCurrency(due)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={onClose}>
              Cancel
            </Button>
            <Button className="rounded-full" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving..." : "Save order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add payment</DialogTitle>
            <DialogDescription>
              Record an additional payment for {order.code}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="flex justify-between text-sm">
                <span>Remaining due</span>
                <span className="font-semibold">{formatCurrency(due)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment amount</Label>
              <Input
                id="payment-amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                inputMode="decimal"
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-remarks">Remarks</Label>
              <Input
                id="payment-remarks"
                value={paymentRemarks}
                onChange={(e) => setPaymentRemarks(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={paymentSaving}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              className="rounded-full"
              disabled={paymentSaving}
              onClick={() => void savePayment(false)}
            >
              {paymentSaving && !paymentReceiptSending ? "Saving..." : "Save payment"}
            </Button>
            <Button
              className="rounded-full"
              disabled={paymentSaving || !order.mobile.trim()}
              onClick={() => void savePayment(true)}
            >
              <MessageCircle className="size-4" />
              {paymentReceiptSending ? "Saving & sending..." : "Save & send payment receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Info({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}
