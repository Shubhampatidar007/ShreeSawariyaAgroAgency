import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowUpRight, IndianRupee, Package, Plus, Users } from "lucide-react";
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

const formatDay = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

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
  const [salesRange, setSalesRange] = useState<"7D" | "1M" | "3M" | "1Y" | "ALL">("1M");
  const [profitDay, setProfitDay] = useState<string | null>(null);

  const { orders, customers, inventory, supplierLedger, customerLedger, payments } = useShopStore((s) => s);
  const today = isoDay(new Date().toISOString());

  const inventoryCostByName = useMemo(
    () => new Map(inventory.map((item) => [item.productName.trim().toLowerCase(), item.purchasePrice])),
    [inventory],
  );

  const getPurchasePrice = (productName: string) =>
    inventoryCostByName.get(productName.trim().toLowerCase()) ?? 0;

  const saleEntries = customerLedger.filter((entry) => (entry.entryType as string) === "sale");
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
      change: t("admin.overview.stats.due", {
        amount: formatCurrency(customers.reduce((sum, customer) => sum + customer.currentDue, 0)),
      }),
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

  const dailyRows = useMemo(() => {
    const daily = new Map<string, { sales: number; purchases: number; cost: number }>();
    const ensure = (date: string) => {
      const current = daily.get(date) ?? { sales: 0, purchases: 0, cost: 0 };
      daily.set(date, current);
      return current;
    };

    orders.forEach((order) => {
      const row = ensure(isoDay(order.placedOn));
      row.sales += order.total;
      row.cost += order.items.reduce(
        (sum, item) => sum + item.quantity * getPurchasePrice(item.product),
        0,
      );
    });

    saleEntries.forEach((entry) => {
      const row = ensure(isoDay(entry.date));
      row.sales += entry.amount;
      row.cost += entry.quantity * getPurchasePrice(entry.product);
    });

    supplierLedger.forEach((entry) => {
      if (entry.type !== "purchase") return;
      const row = ensure(isoDay(entry.date));
      row.purchases += entry.amount;
    });

    const dates = [...daily.keys()].sort();
    if (dates.length === 0) return [];

    const rows: { date: string; sales: number; purchases: number; cost: number; profit: number }[] = [];
    for (let date = dates[0]; date <= dates[dates.length - 1]; date = addDays(date, 1)) {
      const row = daily.get(date) ?? { sales: 0, purchases: 0, cost: 0 };
      rows.push({ date, sales: row.sales, purchases: row.purchases, cost: row.cost, profit: row.sales - row.cost });
    }
    return rows;
  }, [orders, saleEntries, supplierLedger, inventoryCostByName]);

  const salesChartRows = useMemo(() => {
    if (dailyRows.length === 0) return [];
    const rangeDays = { "7D": 7, "1M": 30, "3M": 90, "1Y": 365, ALL: Number.POSITIVE_INFINITY }[salesRange];
    const rows = Number.isFinite(rangeDays) ? dailyRows.slice(-rangeDays) : dailyRows;
    return rows.map((row) => ({
      ...row,
      label: new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    }));
  }, [dailyRows, salesRange]);

  const overallProfit = dailyRows.reduce((sum, row) => sum + row.profit, 0);
  const selectedProfitDay = profitDay ?? today;
  const currentProfit = dailyRows.find((row) => row.date === selectedProfitDay)?.profit ?? 0;
  const previousProfit = useMemo(() => {
    const previousDate = addDays(selectedProfitDay, -1);
    return dailyRows.find((row) => row.date === previousDate)?.profit ?? 0;
  }, [dailyRows, selectedProfitDay]);
  const profitChange =
    previousProfit === 0 ? (currentProfit === 0 ? 0 : 100) : ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100;

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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ScrollReveal direction="up" distance={28} duration={700} scale={0.98} blur={2}>
          <Card className="overflow-hidden shadow-soft">
            <CardHeader className="gap-5 pb-3">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-lg">Sales & Purchases</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Daily movement of sales revenue against inventory purchases.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right sm:block">
                    <p className="text-xs text-muted-foreground">Today</p>
                    <p className="text-lg font-semibold tracking-tight">{formatCurrency(todaysSales)}</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full">Live data</Badge>
                </div>
              </div>
              <div className="flex w-fit items-center gap-1 rounded-xl bg-muted/60 p-1">
                {(["7D", "1M", "3M", "1Y", "ALL"] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setSalesRange(range)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      salesRange === range ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="h-[360px] pt-0">
              {salesChartRows.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No sales or purchase data available yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesChartRows} margin={{ top: 20, right: 12, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : String(value))}
                    />
                    <Tooltip
                      labelFormatter={(_, payload) => (payload?.[0]?.payload?.date ? formatDay(payload[0].payload.date) : "")}
                      contentStyle={{ borderRadius: 14, border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-card-foreground)" }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name === "sales" ? "Sales" : "Purchases"]}
                    />
                    <Line type="monotone" dataKey="sales" name="sales" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="purchases" name="purchases" stroke="var(--color-chart-3)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
            <div className="flex flex-wrap items-center gap-5 border-t border-border px-6 py-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[var(--color-chart-1)]" />Sales</span>
              <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[var(--color-chart-3)]" />Purchases</span>
              <span className="ml-auto">{salesChartRows.length} day{salesChartRows.length === 1 ? "" : "s"} shown</span>
            </div>
          </Card>
        </ScrollReveal>

        <ScrollReveal direction="right" distance={24} duration={650} scale={0.98}>
          <Card className="h-full overflow-hidden shadow-soft">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Current Day Profit</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Customer selling price − inventory cost</p>
                </div>
                <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${profitChange < 0 ? "border-destructive/30 text-destructive" : "border-primary/20 text-primary"}`}>
                  {profitChange >= 0 ? "+" : ""}{profitChange.toFixed(2)}%
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{selectedProfitDay === today ? "Today" : formatDay(selectedProfitDay)}</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className={`text-4xl font-bold tracking-tight ${currentProfit < 0 ? "text-destructive" : "text-foreground"}`}>{formatCurrency(currentProfit)}</p>
                  <ArrowUpRight className={`mb-1 size-5 ${profitChange < 0 ? "rotate-90 text-destructive" : "text-primary"}`} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Compared with the previous recorded day.</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Day-wise profit</span>
                  <span className="text-xs font-medium">{dailyRows.length} days</span>
                </div>
                <div className="mt-3 max-h-48 space-y-1 overflow-auto pr-1">
                  {dailyRows.slice().reverse().map((row) => (
                    <button
                      key={row.date}
                      type="button"
                      onClick={() => setProfitDay(row.date)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors ${selectedProfitDay === row.date ? "bg-background shadow-sm" : "hover:bg-background/70"}`}
                    >
                      <span className="text-muted-foreground">{formatDay(row.date)}</span>
                      <span className={`font-semibold ${row.profit < 0 ? "text-destructive" : "text-foreground"}`}>{formatCurrency(row.profit)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs text-muted-foreground">Overall gross profit</span>
                <span className="font-semibold">{formatCurrency(overallProfit)}</span>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>

      <ScrollReveal direction="up" distance={28} duration={700} scale={0.98} blur={2}>
        <Card className="shadow-soft">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Profit history</CardTitle>
              <p className="text-xs text-muted-foreground">Day-wise sales, inventory cost and gross profit through the latest stored record.</p>
            </div>
            <Badge variant="outline" className="rounded-full">{formatCurrency(overallProfit)} total</Badge>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="grid min-w-[620px] grid-cols-[1.2fr_1fr_1fr_1fr] gap-4 border-b border-border px-2 pb-3 text-xs font-medium text-muted-foreground">
              <span>Date</span><span className="text-right">Sales</span><span className="text-right">Inventory cost</span><span className="text-right">Profit</span>
            </div>
            <div className="min-w-[620px] divide-y divide-border">
              {dailyRows.slice().reverse().map((row) => (
                <button
                  key={row.date}
                  type="button"
                  onClick={() => setProfitDay(row.date)}
                  className="grid w-full grid-cols-[1.2fr_1fr_1fr_1fr] gap-4 px-2 py-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="text-left font-medium">{formatDay(row.date)}</span>
                  <span className="text-right">{formatCurrency(row.sales)}</span>
                  <span className="text-right text-muted-foreground">{formatCurrency(row.cost)}</span>
                  <span className={`text-right font-semibold ${row.profit < 0 ? "text-destructive" : "text-foreground"}`}>{formatCurrency(row.profit)}</span>
                </button>
              ))}
            </div>
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
            <SummaryRow label="Today's gross profit" value={formatCurrency(dailyRows.find((row) => row.date === today)?.profit ?? 0)} />
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
