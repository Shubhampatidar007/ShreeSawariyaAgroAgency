import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, IndianRupee, Package, Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { useAuth } from "@/lib/auth-store";
import { formatCurrency, useShopStore } from "@/lib/shop-store";
import { useI18n } from "@/lib/i18n";
import type { StatItem } from "@/types";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

const isoDay = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const addDays = (day: string, amount: number) => {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(year, month - 1, date + amount);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(
    next.getDate(),
  ).padStart(2, "0")}`;
};

function greeting(t: (key: string) => string) {
  const hour = new Date().getHours();
  if (hour < 12) return t("common.greeting.morning");
  if (hour < 17) return t("common.greeting.afternoon");
  return t("common.greeting.evening");
}

function AdminOverview() {
  const user = useAuth();
  const { t } = useI18n();
  const [dayCloseOpen, setDayCloseOpen] = useState(false);
  const { orders, customers, inventory, supplierLedger, customerLedger, payments } = useShopStore((s) => s);

  const today = isoDay(new Date().toISOString());
  const inventoryCostByName = useMemo(
    () => new Map(inventory.map((item) => [item.productName.trim().toLowerCase(), item.purchasePrice])),
    [inventory],
  );

  const getPurchasePrice = (productName: string) =>
    inventoryCostByName.get(productName.trim().toLowerCase()) ?? 0;

  const saleEntries = customerLedger.filter(
    (entry) => (entry.entryType as string) === "sale" || (entry.entryType as string) === "purchase",
  );

  const todaysOrders = orders.filter((order) => isoDay(order.placedOn) === today);
  const todaysKhataSales = saleEntries.filter((entry) => isoDay(entry.date) === today);
  const todaysSales =
    todaysOrders.reduce((sum, order) => sum + order.total, 0) +
    todaysKhataSales.reduce((sum, entry) => sum + entry.amount, 0);
  const todaysCollected =
    todaysOrders.reduce((sum, order) => sum + order.paid, 0) +
    todaysKhataSales.reduce((sum, entry) => sum + entry.payment, 0);
  const todaysBillCount = todaysOrders.length + todaysKhataSales.length;
  const stockValue = inventory.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
  const lowStockItems = inventory.filter((item) => item.quantity <= item.minStockLevel);
  const activeCustomers = customers.filter((customer) => customer.status === "active");

  const stats: StatItem[] = [
    {
      id: "sales",
      label: t("admin.overview.stats.sales"),
      value: formatCurrency(todaysSales),
      helper: t("admin.overview.stats.salesHelper", { count: todaysBillCount }),
      change: t("admin.overview.stats.collected", { amount: formatCurrency(todaysCollected) }),
      trend: "up",
      icon: IndianRupee,
    },
    {
      id: "stock",
      label: t("admin.overview.stats.stock"),
      value: formatCurrency(stockValue),
      helper: t("admin.overview.stats.stockHelper", { count: inventory.length }),
      change: t("admin.overview.stats.units", { count: inventory.reduce((sum, item) => sum + item.quantity, 0) }),
      trend: "flat",
      icon: Package,
    },
    {
      id: "customers",
      label: t("admin.overview.stats.customers"),
      value: String(activeCustomers.length),
      helper: t("admin.overview.stats.customersHelper", { count: customers.length }),
      change: t("admin.overview.stats.due", { amount: formatCurrency(customers.reduce((sum, c) => sum + c.currentDue, 0)) }),
      trend: "flat",
      icon: Users,
    },
    {
      id: "alerts",
      label: t("admin.overview.stats.alerts"),
      value: String(lowStockItems.length),
      helper: t("admin.overview.stats.alertsHelper"),
      change: lowStockItems.length ? t("admin.overview.stats.actionNeeded") : t("admin.overview.stats.allHealthy"),
      trend: lowStockItems.length ? "down" : "up",
      icon: AlertTriangle,
    },
  ];

  const salesTrend = useMemo(() => {
    const months: { key: string; month: string; sales: number; purchases: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        month: date.toLocaleDateString("en-IN", { month: "short" }),
        sales: 0,
        purchases: 0,
      });
    }
    const bucket = (date: string) => months.find((month) => isoDay(date).startsWith(month.key));
    orders.forEach((order) => {
      const month = bucket(order.placedOn);
      if (month) month.sales += order.total;
    });
    saleEntries.forEach((entry) => {
      const month = bucket(entry.date);
      if (month) month.sales += entry.amount;
    });
    supplierLedger.forEach((entry) => {
      const month = bucket(entry.date);
      if (month && entry.type === "purchase") month.purchases += entry.amount;
    });
    return months;
  }, [orders, saleEntries, supplierLedger]);

  const profitRows = useMemo(() => {
    const daily = new Map<string, { revenue: number; cost: number }>();
    const ensure = (date: string) => {
      const current = daily.get(date) ?? { revenue: 0, cost: 0 };
      daily.set(date, current);
      return current;
    };

    saleEntries.forEach((entry) => {
      const row = ensure(isoDay(entry.date));
      row.revenue += entry.amount;
      row.cost += entry.quantity * getPurchasePrice(entry.product);
    });

    orders.forEach((order) => {
      const row = ensure(isoDay(order.placedOn));
      row.revenue += Math.max(order.subtotal - order.discount, 0);
      row.cost += order.items.reduce(
        (sum, item) => sum + item.quantity * getPurchasePrice(item.product),
        0,
      );
    });

    const dates = [...daily.keys()].sort();
    if (dates.length === 0) return [];

    const rows: { date: string; revenue: number; cost: number; profit: number }[] = [];
    for (let date = dates[0]; date <= dates[dates.length - 1]; date = addDays(date, 1)) {
      const row = daily.get(date) ?? { revenue: 0, cost: 0 };
      rows.push({ ...row, date, profit: row.revenue - row.cost });
    }
    return rows;
  }, [saleEntries, orders, inventoryCostByName]);

  const overallProfit = profitRows.reduce((sum, row) => sum + row.profit, 0);

  return (
    <div className="space-y-6">
      <ScrollReveal direction="up" distance={18} duration={550}>
        <PageHeader
          eyebrow={t("admin.overview.title")}
          title={`${greeting(t)}${user ? `, ${user.name.split(" ")[0]}` : ""}`}
          description={t("admin.overview.description")}
          actions={
            <>
              <Button variant="outline" className="rounded-full" onClick={() => setDayCloseOpen(true)}>
                {t("admin.overview.dayCloseSummary")}
              </Button>
              <Button className="rounded-full" asChild>
                <Link to="/admin/sales">
                  <Plus className="size-4" /> {t("admin.overview.newSaleBill")}
                </Link>
              </Button>
            </>
          }
        />
      </ScrollReveal>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <ScrollReveal key={stat.id} delay={index * 80} direction="up" distance={24} duration={600} scale={0.97} blur={2}>
            <StatCard stat={stat} />
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal direction="up" distance={28} duration={700} scale={0.98} blur={2}>
        <Card className="shadow-soft">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{t("admin.overview.salesVsPurchases")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("admin.overview.salesVsPurchasesSubtitle")}</p>
            </div>
            <Badge variant="secondary">{t("common.liveData")}</Badge>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ left: -12, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${Math.round(value / 1000)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-card-foreground)" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area type="monotone" dataKey="sales" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#sales)" />
                <Area type="monotone" dataKey="purchases" stroke="var(--color-chart-3)" strokeWidth={2} fill="url(#purchases)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </ScrollReveal>

      <ScrollReveal direction="up" distance={28} duration={700} scale={0.98} blur={2}>
        <Card className="shadow-soft overflow-hidden">
          <CardHeader className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Overall profit</CardTitle>
              <p className="text-xs text-muted-foreground">Estimated gross profit = sales revenue − inventory cost, using the current purchase price for each product.</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 px-5 py-3 text-right">
              <p className="text-xs text-muted-foreground">Total gross profit</p>
              <p className={`text-2xl font-bold tracking-tight ${overallProfit < 0 ? "text-destructive" : "text-primary"}`}>
                {formatCurrency(overallProfit)}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {profitRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No sales data available yet.</div>
            ) : (
              <div className="max-h-[420px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Inventory cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitRows.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell className="font-medium">
                          {new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(row.cost)}</TableCell>
                        <TableCell className={`text-right font-semibold ${row.profit < 0 ? "text-destructive" : "text-primary"}`}>
                          {formatCurrency(row.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </ScrollReveal>

      <Dialog open={dayCloseOpen} onOpenChange={setDayCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.overview.dayCloseSummary")}</DialogTitle>
            <DialogDescription>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <SummaryRow label={t("admin.overview.dayCloseBillsGenerated")} value={String(todaysBillCount)} />
            <SummaryRow label={t("admin.overview.dayCloseTotalSales")} value={formatCurrency(todaysSales)} />
            <SummaryRow label={t("admin.overview.dayCloseAmountCollected")} value={formatCurrency(todaysCollected)} />
            <SummaryRow label={t("admin.overview.dayCloseOutstanding")} value={formatCurrency(Math.max(todaysSales - todaysCollected, 0))} />
            <SummaryRow label={t("admin.overview.dayClosePaymentsRecorded")} value={String(payments.filter((payment) => isoDay(payment.date) === today).length)} />
            <SummaryRow label="Today's gross profit" value={formatCurrency(profitRows.find((row) => row.date === today)?.profit ?? 0)} />
          </div>
          <Button className="w-full rounded-full" onClick={() => window.print()}>{t("admin.overview.printSummary")}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
