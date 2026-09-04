import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import {
  AlertTriangle,
  ClipboardCheck,
  IndianRupee,
  Package,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
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
import { buildDailyMetrics } from "@/lib/business-metrics";
import type { StatItem } from "@/types";

export const Route = createFileRoute("/admin/")({ component: AdminOverview });
const formatDay = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const formatCompactDay = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const greeting = (t: (key: string) => string) => {
  const hour = new Date().getHours();
  if (hour < 12) return t("common.greeting.morning");
  if (hour < 17) return t("common.greeting.afternoon");
  return t("common.greeting.evening");
};
function AdminOverview() {
  const user = useAuth();
  const { t } = useI18n();
  const [dayCloseOpen, setDayCloseOpen] = useState(false);
  const [salesRange, setSalesRange] = useState<"7D" | "1M" | "3M" | "1Y" | "ALL">("1M");
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    let active = true;
    let frame1 = 0;
    let frame2 = 0;
    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        if (active) setChartReady(true);
      });
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, []);
  const {
    orders,
    customers,
    inventory,
    supplierLedger,
    customerLedger,
    customerSaleItems,
    payments,
    loading,
  } = useShopStore((s) => s);
  const today = new Date().toISOString().slice(0, 10);
  const dailyRows = useMemo(
    () => buildDailyMetrics(orders, customerLedger, customerSaleItems, supplierLedger, inventory, "yearly"),
    [orders, customerLedger, customerSaleItems, supplierLedger, inventory],
  );
  const visibleProfitRows = useMemo(() => dailyRows.slice(-7), [dailyRows]);
  const dashboardDerived = useMemo(() => {
    let todaysSales = 0;
    let todaysCollected = 0;
    let todaysBillCount = 0;
    let stockValue = 0;
    let stockUnits = 0;
    let lowStockCount = 0;
    let activeCustomersCount = 0;
    let todaysDue = 0;
    let todaysPaymentsCount = 0;
    let todaysSupplierPaid = 0;
    let topSaleProduct = "No sales yet";
    let topSaleProductQuantity = 0;
    let topSaleProductProfit = 0;

    for (const order of orders) {
      if (order.placedOn.slice(0, 10) !== today) continue;
      todaysSales += order.total;
      todaysBillCount += 1;
    }

    for (const entry of customerLedger) {
      if ((entry.entryType as string) !== "sale" || entry.date.slice(0, 10) !== today) continue;
      todaysSales += entry.amount;
      todaysBillCount += 1;
    }

    for (const entry of supplierLedger) {
      if (entry.date.slice(0, 10) !== today) continue;
      const type = entry.entryType as string;
      if (type === "payment" || type === "advance") todaysSupplierPaid += entry.amount;
    }

    for (const item of inventory) {
      stockValue += item.quantity * item.purchasePrice;
      stockUnits += item.quantity;
      if (item.quantity <= item.minStockLevel) lowStockCount += 1;
    }

    for (const entry of customerLedger) {
      if (entry.date.slice(0, 10) !== today) continue;
      const type = entry.entryType as string;
      if (type === "sale" || type === "purchase") todaysDue += entry.amount - entry.payment;
    }

    for (const payment of payments) {
      if (payment.date.slice(0, 10) !== today) continue;
      todaysPaymentsCount += 1;
      if (payment.direction === "incoming" && payment.status === "success") {
        todaysCollected += payment.amount;
      }
    }

    const productStats = new Map<string, { name: string; quantity: number; revenue: number; cost: number }>();
    const getProductStat = (name: string) => {
      const key = name.trim().toLowerCase();
      const current = productStats.get(key) ?? {
        name: name.trim() || "Unknown product",
        quantity: 0,
        revenue: 0,
        cost: 0,
      };
      productStats.set(key, current);
      return current;
    };
    for (const order of orders) {
      for (const item of order.items) {
        const stat = getProductStat(item.product);
        stat.quantity += item.quantity;
        stat.revenue += item.amount;
        const purchasePrice =
          inventory.find(
            (itemData) => itemData.productName.trim().toLowerCase() === item.product.trim().toLowerCase(),
          )?.purchasePrice ?? 0;
        stat.cost += item.quantity * purchasePrice;
      }
    }
    const topProduct = [...productStats.values()]
      .map((product) => ({ ...product, profit: product.revenue - product.cost }))
      .filter((product) => product.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)[0];
    if (topProduct) {
      topSaleProduct = topProduct.name;
      topSaleProductQuantity = topProduct.quantity;
      topSaleProductProfit = topProduct.profit;
    }

    return {
      todaysSales,
      todaysCollected,
      todaysBillCount,
      stockValue,
      stockUnits,
      lowStockCount,
      activeCustomersCount,
      todaysDue,
      todaysPaymentsCount,
      todaysSupplierPaid,
      topSaleProduct,
      topSaleProductQuantity,
      topSaleProductProfit,
    };
  }, [customers, customerLedger, inventory, orders, payments, supplierLedger, today]);

  const todaysProfit = useMemo(() => dailyRows.find((row) => row.date === today)?.profit ?? 0, [dailyRows, today]);
  const stats: StatItem[] = [
    {
      id: "sales",
      label: t("admin.overview.stats.sales"),
      value: formatCurrency(dashboardDerived.todaysSales),
      helper: t("admin.overview.stats.salesHelper", { count: dashboardDerived.todaysBillCount }),
      change: t("admin.overview.stats.collected", { amount: formatCurrency(dashboardDerived.todaysCollected) }),
      trend: "up",
      icon: IndianRupee,
    },
    {
      id: "stock",
      label: t("admin.overview.stats.stock"),
      value: formatCurrency(dashboardDerived.stockValue),
      helper: t("admin.overview.stats.stockHelper", { count: inventory.length }),
      change: t("admin.overview.stats.units", { count: dashboardDerived.stockUnits }),
      trend: "flat",
      icon: Package,
    },
    {
      id: "customer-due",
      label: "Today's Due",
      value: formatCurrency(dashboardDerived.todaysDue),
      helper: "Due created today",
      change: "Across all customers",
      trend: "flat",
      icon: IndianRupee,
    },
    {
      id: "alerts",
      label: t("admin.overview.stats.alerts"),
      value: String(dashboardDerived.lowStockCount),
      helper: t("admin.overview.stats.alertsHelper"),
      change: dashboardDerived.lowStockCount ? t("admin.overview.stats.actionNeeded") : t("admin.overview.stats.allHealthy"),
      trend: dashboardDerived.lowStockCount ? "down" : "up",
      icon: AlertTriangle,
    },
    {
      id: "supplier-paid",
      label: "Supplier Paid Today",
      value: formatCurrency(dashboardDerived.todaysSupplierPaid),
      helper: "Amount paid to suppliers today",
      change: "Today's supplier payments",
      trend: "flat",
      icon: WalletCards,
    },
    {
      id: "top-sale-product",
      label: "Top Sale Product",
      value: dashboardDerived.topSaleProduct,
      helper: dashboardDerived.topSaleProduct === "No sales yet" ? "No products sold yet" : `${dashboardDerived.topSaleProductQuantity} units sold`,
      change: dashboardDerived.topSaleProduct === "No sales yet" ? "No profit recorded" : `${formatCurrency(dashboardDerived.topSaleProductProfit)} profit`,
      trend: "up",
      icon: TrendingUp,
    },
  ];
  const salesChartRows = useMemo(() => {
    if (!dailyRows.length) return [];
    const rangeDays = { "7D": 7, "1M": 30, "3M": 90, "1Y": 365, ALL: Number.POSITIVE_INFINITY }[salesRange];
    const rows = Number.isFinite(rangeDays) ? dailyRows.slice(-rangeDays) : dailyRows;
    return rows.map((row) => ({ ...row, label: formatCompactDay(row.date) }));
  }, [dailyRows, salesRange]);
  const chartTotals = useMemo(
    () => salesChartRows.reduce((totals, row) => ({ sales: totals.sales + row.sales, purchases: totals.purchases + row.purchases }), { sales: 0, purchases: 0 }),
    [salesChartRows],
  );
  const overallProfit = visibleProfitRows.reduce((sum, row) => sum + row.profit, 0);
  return (
    <div className="space-y-6">
      <ScrollReveal direction="up" distance={12} duration={300}>
        <PageHeader
          eyebrow={t("admin.overview.title")}
          title={`${greeting(t)}${user ? `, ${user.name.split(" ")[0]}` : ""}`}
          description={t("admin.overview.description")}
          actions={<Button variant="outline" className="rounded-full" onClick={() => setDayCloseOpen(true)}><ClipboardCheck className="size-4" />{t("admin.overview.dayCloseSummary")}</Button>}
        />
      </ScrollReveal>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((stat, index) => (
          <ScrollReveal key={stat.id} delay={index * 40} direction="up" distance={12} duration={300}><StatCard stat={stat} loading={loading} /></ScrollReveal>
        ))}
      </div>
      <ScrollReveal direction="up" distance={28} duration={700} scale={0.98} blur={2}>
        <Card className="overflow-hidden border-border/80 shadow-soft">
          <CardHeader className="gap-5 pb-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div><div className="flex items-center gap-2"><CardTitle className="text-lg">Sales & Purchases</CardTitle><Badge variant="secondary" className="rounded-full">Live</Badge></div><p className="mt-1 text-xs text-muted-foreground">Daily sales revenue against inventory purchases.</p></div>
              <div className="flex items-end gap-5 sm:items-center"><div className="text-right"><p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Selected period sales</p><p className="text-lg font-semibold tracking-tight">{formatCurrency(chartTotals.sales)}</p></div><div className="hidden border-l border-border pl-5 sm:block"><p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Purchases</p><p className="text-lg font-semibold tracking-tight">{formatCurrency(chartTotals.purchases)}</p></div></div>
            </div>
            <div className="flex w-fit items-center gap-1 rounded-xl bg-muted/70 p-1 ring-1 ring-border/60">{(["7D", "1M", "3M", "1Y", "ALL"] as const).map((range) => <button key={range} type="button" onClick={() => setSalesRange(range)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${salesRange === range ? "bg-background text-foreground shadow-sm ring-1 ring-border/60" : "text-muted-foreground hover:bg-background/60 hover:text-foreground"}`}>{range}</button>)}</div>
          </CardHeader>
          <CardContent className="h-[370px] pt-0">
            {loading || !chartReady ? <div className="flex h-full flex-col justify-end gap-4 py-6"><Skeleton className="h-1/2 w-full" /></div> : !salesChartRows.length ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No sales yet</div> : (
              <ResponsiveContainer width="100%" height="100%"><AreaChart data={salesChartRows}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false}/><XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11}/><YAxis stroke="var(--color-muted-foreground)" fontSize={11}/><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? formatDay(payload[0].payload.date) : ""} formatter={(value: number, name: string) => [formatCurrency(value), name === "sales" ? "Sales" : "Purchases"]}/><Area type="monotone" dataKey="purchases" name="purchases" stroke="var(--color-chart-3)" fillOpacity={0}/><Area type="monotone" dataKey="sales" name="sales" stroke="var(--color-chart-1)" fillOpacity={0.18} fill="var(--color-chart-1)"/></AreaChart></ResponsiveContainer>
            )}
          </CardContent>
          <div className="flex gap-5 border-t border-border px-6 py-4 text-xs text-muted-foreground"><span>Sales: {formatCurrency(chartTotals.sales)}</span><span>Purchases: {formatCurrency(chartTotals.purchases)}</span><span className="ml-auto">{salesChartRows.length} days</span></div>
        </Card>
      </ScrollReveal>
      <ScrollReveal direction="up" distance={28} duration={700}>
        <Card className="overflow-hidden border-border/80 shadow-soft">
          <CardHeader className="flex flex-col gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base">Profit history — last 7 days</CardTitle><p className="mt-1 text-xs text-muted-foreground">Day-wise sales, inventory cost, profit and margin for the latest seven days.</p></div><Badge variant="outline" className="w-fit rounded-full px-3 py-1">{formatCurrency(overallProfit)} total</Badge></CardHeader>
          <CardContent className="p-0">
            {loading ? <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div> : !visibleProfitRows.length ? <div className="px-6 py-14 text-center text-sm text-muted-foreground">No profit records yet</div> : <div className="overflow-x-auto"><div className="grid min-w-[760px] grid-cols-[1.15fr_1fr_1fr_1fr_0.8fr] gap-4 border-b border-border bg-muted/20 px-6 py-3 text-xs font-medium text-muted-foreground"><span>Date</span><span className="text-right">Sales</span><span className="text-right">Inventory cost</span><span className="text-right">Profit</span><span className="text-right">Margin</span></div>{visibleProfitRows.slice().reverse().map((row) => <div key={row.date} className="grid min-w-[760px] grid-cols-[1.15fr_1fr_1fr_1fr_0.8fr] gap-4 border-b border-border px-6 py-3.5 text-sm"><span className="font-medium">{formatDay(row.date)}</span><span className="text-right">{formatCurrency(row.sales)}</span><span className="text-right text-muted-foreground">{formatCurrency(row.cost)}</span><span className={`text-right font-semibold ${row.profit < 0 ? "text-destructive" : ""}`}>{formatCurrency(row.profit)}</span><span className="text-right font-semibold">{row.margin.toFixed(1)}%</span></div>)}</div>}
          </CardContent>
        </Card>
      </ScrollReveal>
      <Dialog open={dayCloseOpen} onOpenChange={setDayCloseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("admin.overview.dayCloseSummary")}</DialogTitle><DialogDescription>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</DialogDescription></DialogHeader>
          <div className="space-y-2 text-sm">
            <SummaryRow label={t("admin.overview.dayCloseBillsGenerated")} value={loading ? "—" : String(dashboardDerived.todaysBillCount)} />
            <SummaryRow label={t("admin.overview.dayCloseTotalSales")} value={loading ? "—" : formatCurrency(dashboardDerived.todaysSales)} />
            <SummaryRow label={t("admin.overview.dayCloseAmountCollected")} value={loading ? "—" : formatCurrency(dashboardDerived.todaysCollected)} />
            <SummaryRow label={t("admin.overview.dayCloseOutstanding")} value={loading ? "—" : formatCurrency(Math.max(dashboardDerived.todaysSales - dashboardDerived.todaysCollected, 0))} />
            <SummaryRow label={t("admin.overview.dayClosePaymentsRecorded")} value={loading ? "—" : String(dashboardDerived.todaysPaymentsCount)} />
            <SummaryRow label="Today's gross profit" value={loading ? "—" : formatCurrency(todaysProfit)} />
          </div>
          <Button className="w-full rounded-full" onClick={() => window.print()}>{t("admin.overview.printSummary")}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-border py-2"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}
