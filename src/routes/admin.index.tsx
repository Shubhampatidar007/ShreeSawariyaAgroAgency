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
import { AlertTriangle, ArrowRight, IndianRupee, Package, Plus, Users } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
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
import { quickActions } from "@/data/quick-actions";
import { useAuth } from "@/lib/auth-store";
import { formatCurrency, formatDate, useShopStore } from "@/lib/shop-store";
import { useI18n } from "@/lib/i18n";
import type { StatItem } from "@/types";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

/** Returns the calendar day in the browser's local timezone without shifting date-only values. */
const isoDay = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
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
  const {
    orders,
    customers,
    inventory,
    supplierLedger,
    customerLedger,
    activityLogs,
    payments,
    loading,
  } = useShopStore((s) => s);

  const today = isoDay(new Date().toISOString());
  const todaysOrders = orders.filter((o) => isoDay(o.placedOn) === today);
  const todaysKhataSales = customerLedger.filter(
    (entry) => isoDay(entry.date) === today && entry.entryType === "purchase",
  );
  const todaysSales =
    todaysOrders.reduce((sum, o) => sum + o.total, 0) +
    todaysKhataSales.reduce((sum, entry) => sum + entry.amount, 0);
  const todaysCollected =
    todaysOrders.reduce((sum, o) => sum + o.paid, 0) +
    todaysKhataSales.reduce((sum, entry) => sum + entry.payment, 0);
  const todaysBillCount = todaysOrders.length + todaysKhataSales.length;
  const stockValue = inventory.reduce((sum, i) => sum + i.quantity * i.purchasePrice, 0);
  const lowStockItems = inventory.filter((i) => i.quantity <= i.minStockLevel);
  const activeCustomers = customers.filter((c) => c.status === "active");

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
      change: t("admin.overview.stats.units", { count: inventory.reduce((s, i) => s + i.quantity, 0) }),
      trend: "flat",
      icon: Package,
    },
    {
      id: "customers",
      label: t("admin.overview.stats.customers"),
      value: String(activeCustomers.length),
      helper: t("admin.overview.stats.customersHelper", { count: customers.length }),
      change: t("admin.overview.stats.due", { amount: formatCurrency(customers.reduce((s, c) => s + c.currentDue, 0)) }),
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
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        month: d.toLocaleDateString("en-IN", { month: "short" }),
        sales: 0,
        purchases: 0,
      });
    }
    const bucket = (date: string) => months.find((m) => isoDay(date).startsWith(m.key));
    orders.forEach((o) => {
      const m = bucket(o.placedOn);
      if (m) m.sales += o.total;
    });
    customerLedger.forEach((entry) => {
      const m = bucket(entry.date);
      if (m && entry.entryType === "purchase") m.sales += entry.amount;
    });
    supplierLedger.forEach((e) => {
      const m = bucket(e.date);
      if (m && e.type === "purchase") m.purchases += e.amount;
    });
    return months;
  }, [orders, customerLedger, supplierLedger]);

  const recentBills = orders.slice(0, 5);

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
    <ScrollReveal
      key={stat.id}
      delay={index * 80}
      direction="up"
      distance={24}
      duration={600}
      scale={0.97}
      blur={2}
    >
      <StatCard stat={stat} />
    </ScrollReveal>
  ))}
</div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ScrollReveal
  direction="up"
  distance={28}
  duration={700}
  scale={0.98}
  blur={2}
>

        <Card className="shadow-soft lg:col-span-2">
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
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    color: "var(--color-card-foreground)",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area type="monotone" dataKey="sales" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#sales)" />
                <Area type="monotone" dataKey="purchases" stroke="var(--color-chart-3)" strokeWidth={2} fill="url(#purchases)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
</ScrollReveal>
<ScrollReveal
  direction="right"
  distance={24}
  duration={650}
  scale={0.98}
>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.overview.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.to}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div>
                  <p className="text-sm font-semibold">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
        </ScrollReveal>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ScrollReveal
  direction="up"
  distance={28}
  duration={700}
  scale={0.98}
  blur={2}
>
        <Card className="shadow-soft lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("admin.overview.recentBills")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/sales">{t("admin.overview.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Village</TableHead>
                    <TableHead className="hidden sm:table-cell">Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        {loading ? t("admin.overview.loadingBills") : t("admin.overview.noBills")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.code}</TableCell>
                        <TableCell>{bill.customerName || t("admin.overview.walkIn")}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {bill.village}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell capitalize text-muted-foreground">
                          {bill.paymentMethod}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(bill.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={bill.paymentStatus === "paid" ? "secondary" : "outline"}
                            className={
                              bill.paymentStatus === "pending"
                                ? "border-destructive/40 capitalize text-destructive"
                                : "capitalize"
                            }
                          >
                            {bill.paymentStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
</ScrollReveal>
        <div className="space-y-4">
          <ScrollReveal
  direction="right"
  distance={24}
  duration={650}
  scale={0.98}
>
  
          <Card className="shadow-soft">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{t("admin.overview.lowStockAlerts")}</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/inventory">Inventory</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {lowStockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("admin.overview.everythingHealthy")}
                </p>
              ) : (
                lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-muted-foreground">
                        {item.quantity}/{item.minStockLevel} {item.unit}
                      </span>
                    </div>
                    <Progress
                      value={
                        item.minStockLevel ? (item.quantity / item.minStockLevel) * 100 : 0
                      }
                      className="h-1.5"
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
</ScrollReveal>
<ScrollReveal
  direction="right"
  distance={24}
  duration={650}
  scale={0.98}
>
          <Card className="shadow-soft">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{t("admin.overview.recentActivity")}</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/activity-logs">{t("admin.overview.allLogs")}</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {activityLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("admin.overview.noActivity")}</p>
              ) : (
                activityLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold">{log.actor}</span> {log.action.toLowerCase()}{" "}
                        <span className="text-muted-foreground">{log.target}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(log.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          </ScrollReveal>
        </div>
      </div>

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
            <SummaryRow label={t("admin.overview.dayCloseBillsGenerated")} value={String(todaysBillCount)} />
            <SummaryRow label={t("admin.overview.dayCloseTotalSales")} value={formatCurrency(todaysSales)} />
            <SummaryRow label={t("admin.overview.dayCloseAmountCollected")} value={formatCurrency(todaysCollected)} />
            <SummaryRow
              label={t("admin.overview.dayCloseOutstanding")}
              value={formatCurrency(Math.max(todaysSales - todaysCollected, 0))}
            />
            <SummaryRow
              label={t("admin.overview.dayClosePaymentsRecorded")}
              value={String(payments.filter((p) => isoDay(p.date) === today).length)}
            />
            <SummaryRow label={t("admin.overview.dayCloseLowStockItems")} value={String(lowStockItems.length)} />
          </div>
          <Button className="w-full rounded-full" onClick={() => window.print()}>
            {t("admin.overview.printSummary")}
          </Button>
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
