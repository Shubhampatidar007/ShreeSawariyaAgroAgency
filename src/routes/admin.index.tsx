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
import { AlertTriangle, ArrowDownRight, ArrowUpRight, IndianRupee, Package, Plus, Users } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
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

const formatCompactDay = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
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

  const {
    orders,
    customers,
    inventory,
    supplierLedger,
    customerLedger,
    payments,
    loading,
  } = useShopStore((s) => s);
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

    const rows: { date: string; sales: number; purchases: number; cost: number; profit: number; margin: number }[] = [];
    for (let date = dates[0]; date <= dates[dates.length - 1]; date = addDays(date, 1)) {
      const row = daily.get(date) ?? { sales: 0, purchases: 0, cost: 0 };
      const profit = row.sales - row.cost;
      rows.push({
        date,
        sales: row.sales,
        purchases: row.purchases,
        cost: row.cost,
        profit,
        margin: row.sales === 0 ? 0 : (profit / row.sales) * 100,
      });
    }
    return rows;
  }, [orders, saleEntries, supplierLedger, inventoryCostByName]);

  const salesChartRows = useMemo(() => {
    if (dailyRows.length === 0) return [];
    const rangeDays = { "7D": 7, "1M": 30, "3M": 90, "1Y": 365, ALL: Number.POSITIVE_INFINITY }[salesRange];
    const rows = Number.isFinite(rangeDays) ? dailyRows.slice(-rangeDays) : dailyRows;
    return rows.map((row) => ({
      ...row,
      label: formatCompactDay(row.date),
    }));
  }, [dailyRows, salesRange]);

  const chartTotals = useMemo(
    () =>
      salesChartRows.reduce(
        (totals, row) => ({
          sales: totals.sales + row.sales,
          purchases: totals.purchases + row.purchases,
        }),
        { sales: 0, purchases: 0 },
      ),
    [salesChartRows],
  );

  const overallProfit = dailyRows.reduce((sum, row) => sum + row.profit, 0);
  const selectedProfitDay = profitDay ?? today;
  const selectedProfitRow = dailyRows.find((row) => row.date === selectedProfitDay);
  const currentProfit = selectedProfitRow?.profit ?? 0;
  const currentRevenue = selectedProfitRow?.sales ?? 0;
  const currentCost = selectedProfitRow?.cost ?? 0;
  const currentMargin = selectedProfitRow?.margin ?? 0;
  const previousProfit = useMemo(() => {
    const previousDate = addDays(selectedProfitDay, -1);
    return dailyRows.find((row) => row.date === previousDate)?.profit ?? 0;
  }, [dailyRows, selectedProfitDay]);
  const profitChange =
    previousProfit === 0
      ? currentProfit === 0
        ? 0
        : 100
      : ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100;

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
              <Button className="rounded-full shadow-sm transition-transform duration-200 hover:-translate-y-px" asChild>
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
          <ScrollReveal
            key={stat.id}
            delay={index * 80}
            direction="up"
            distance={24}
            duration={600}
            scale={0.97}
            blur={2}
          >
            <StatCard stat={stat} loading={loading} />
          </ScrollReveal>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
        <ScrollReveal direction="up" distance={28} duration={700} scale={0.98} blur={2}>
          <Card className="group overflow-hidden border-border/80 shadow-soft transition-shadow duration-300 hover:shadow-lg">
            <CardHeader className="gap-5 pb-3">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Sales & Purchases</CardTitle>
                    <Badge variant="secondary" className="rounded-full">Live</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Daily sales revenue against inventory purchases.
                  </p>
                </div>
                <div className="flex items-end gap-5 sm:items-center">
                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Selected period sales</p>
                    <p className="text-lg font-semibold tracking-tight">{formatCurrency(chartTotals.sales)}</p>
                  </div>
                  <div className="hidden border-l border-border pl-5 sm:block">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Purchases</p>
                    <p className="text-lg font-semibold tracking-tight">{formatCurrency(chartTotals.purchases)}</p>
                  </div>
                </div>
              </div>

              <div className="flex w-fit items-center gap-1 rounded-xl bg-muted/70 p-1 ring-1 ring-border/60">
                {(["7D", "1M", "3M", "1Y", "ALL"] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setSalesRange(range)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      salesRange === range
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="h-[370px] pt-0">
              {loading ? (
                <div className="flex h-full flex-col justify-end gap-4 py-6">
                  <Skeleton className="h-1/2 w-full" />
                  <div className="flex justify-between gap-4">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </div>
              ) : salesChartRows.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <IndianRupee className="size-5" />
                  </div>
                  <p className="mt-4 text-sm font-semibold">No sales yet</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">Create a sale or purchase record and this chart will populate automatically.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesChartRows} margin={{ top: 16, right: 12, left: 4, bottom: 4 }}>
                    <defs>
                      <linearGradient id="sales-fill-light-theme" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="purchases-fill-light-theme" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-card)",
                        color: "var(--color-card-foreground)",
                        boxShadow: "0 14px 30px oklch(0.22 0.025 258 / 0.12)",
                      }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name === "sales" ? "Sales" : "Purchases"]}
                    />
                    <Area type="monotone" dataKey="purchases" name="purchases" stroke="var(--color-chart-3)" strokeWidth={2} fill="url(#purchases-fill-light-theme)" dot={false} activeDot={{ r: 4 }} />
                    <Area type="monotone" dataKey="sales" name="sales" stroke="var(--color-chart-1)" strokeWidth={2.5} fill="url(#sales-fill-light-theme)" dot={false} activeDot={{ r: 5 }} />
                  </AreaChart>
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
          <Card className="h-full overflow-hidden border-border/80 shadow-soft transition-shadow duration-300 hover:shadow-lg">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Current Day Profit</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Customer selling price minus inventory cost.</p>
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-16 rounded-full" />
                ) : (
                  <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${profitChange < 0 ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-primary/20 bg-primary/5 text-primary"}`}>
                    <span className="inline-flex items-center gap-1">
                      {profitChange < 0 ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                      {profitChange >= 0 ? "+" : ""}{profitChange.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-6">
              {loading ? (
                <div className="space-y-5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-11 w-40" />
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </div>
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {selectedProfitDay === today ? "Today" : formatDay(selectedProfitDay)}
                    </p>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <p className={`text-4xl font-bold tracking-tight ${currentProfit < 0 ? "text-destructive" : "text-foreground"}`}>
                        {formatCurrency(currentProfit)}
                      </p>
                      <span className={`mb-1 rounded-full px-2 py-1 text-[11px] font-semibold ${currentProfit < 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                        {currentProfit < 0 ? "Loss" : "Gross profit"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Compared with the previous calendar day.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Revenue" value={formatCurrency(currentRevenue)} />
                    <Metric label="Inventory cost" value={formatCurrency(currentCost)} />
                    <Metric label="Profit margin" value={`${currentMargin.toFixed(1)}%`} />
                    <Metric label="Overall profit" value={formatCurrency(overallProfit)} />
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Day-wise profit</span>
                      <span className="text-xs font-medium">{dailyRows.length} days</span>
                    </div>
                    <div className="mt-3 max-h-44 space-y-1 overflow-auto pr-1">
                      {dailyRows.length === 0 ? (
                        <p className="py-6 text-center text-xs text-muted-foreground">No recorded profit yet.</p>
                      ) : (
                        dailyRows.slice().reverse().map((row) => (
                          <button
                            key={row.date}
                            type="button"
                            onClick={() => setProfitDay(row.date)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all duration-200 ${selectedProfitDay === row.date ? "bg-background shadow-sm ring-1 ring-border/60" : "hover:bg-background/70"}`}
                          >
                            <span className="text-muted-foreground">{formatDay(row.date)}</span>
                            <span className={`font-semibold ${row.profit < 0 ? "text-destructive" : "text-foreground"}`}>{formatCurrency(row.profit)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>

      <ScrollReveal direction="up" distance={28} duration={700} scale={0.98} blur={2}>
        <Card className="overflow-hidden border-border/80 shadow-soft">
          <CardHeader className="flex flex-col gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Profit history</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Day-wise sales, inventory cost, profit and margin through the latest stored record.</p>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">{formatCurrency(overallProfit)} total</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : dailyRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Package className="size-5" />
                </div>
                <p className="mt-4 text-sm font-semibold">No profit records yet</p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">Once the first sale is stored, the daily profit history will appear here automatically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid min-w-[760px] grid-cols-[1.15fr_1fr_1fr_1fr_0.8fr] gap-4 border-b border-border bg-muted/20 px-6 py-3 text-xs font-medium text-muted-foreground">
                  <span>Date</span>
                  <span className="text-right">Sales</span>
                  <span className="text-right">Inventory cost</span>
                  <span className="text-right">Profit</span>
                  <span className="text-right">Margin</span>
                </div>
                <div className="min-w-[760px] divide-y divide-border">
                  {dailyRows.slice().reverse().map((row) => (
                    <button
                      key={row.date}
                      type="button"
                      onClick={() => setProfitDay(row.date)}
                      className="group grid w-full grid-cols-[1.15fr_1fr_1fr_1fr_0.8fr] gap-4 px-6 py-3.5 text-sm transition-colors duration-200 hover:bg-muted/40"
                    >
                      <span className="text-left font-medium group-hover:text-primary">{formatDay(row.date)}</span>
                      <span className="text-right tabular-nums">{formatCurrency(row.sales)}</span>
                      <span className="text-right text-muted-foreground tabular-nums">{formatCurrency(row.cost)}</span>
                      <span className={`text-right font-semibold tabular-nums ${row.profit < 0 ? "text-destructive" : "text-foreground"}`}>{formatCurrency(row.profit)}</span>
                      <span className={`text-right font-semibold tabular-nums ${row.margin < 0 ? "text-destructive" : "text-success"}`}>{row.margin.toFixed(1)}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </ScrollReveal>

      <Dialog open={dayCloseOpen} onOpenChange={setDayCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.overview.dayCloseSummary")}</DialogTitle>
            <DialogDescription>
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <SummaryRow label={t("admin.overview.dayCloseBillsGenerated")} value={loading ? "—" : String(todaysBillCount)} />
            <SummaryRow label={t("admin.overview.dayCloseTotalSales")} value={loading ? "—" : formatCurrency(todaysSales)} />
            <SummaryRow label={t("admin.overview.dayCloseAmountCollected")} value={loading ? "—" : formatCurrency(todaysCollected)} />
            <SummaryRow label={t("admin.overview.dayCloseOutstanding")} value={loading ? "—" : formatCurrency(Math.max(todaysSales - todaysCollected, 0))} />
            <SummaryRow label={t("admin.overview.dayClosePaymentsRecorded")} value={loading ? "—" : String(payments.filter((payment) => isoDay(payment.date) === today).length)} />
            <SummaryRow label="Today's gross profit" value={loading ? "—" : formatCurrency(dailyRows.find((row) => row.date === today)?.profit ?? 0)} />
          </div>
          <Button className="w-full rounded-full shadow-sm transition-transform duration-200 hover:-translate-y-px" onClick={() => window.print()}>
            {t("admin.overview.printSummary")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3 transition-colors duration-200 hover:bg-background">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tracking-tight">{value}</p>
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
