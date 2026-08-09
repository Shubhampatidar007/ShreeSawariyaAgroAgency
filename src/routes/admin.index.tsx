import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import type { StatItem } from "@/types";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

const isoDay = (value: string) => new Date(value).toISOString().slice(0, 10);

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function AdminOverview() {
  const user = useAuth();
  const [dayCloseOpen, setDayCloseOpen] = useState(false);
  const { orders, customers, inventory, supplierLedger, activityLogs, payments, loading } =
    useShopStore((s) => s);

  const today = new Date().toISOString().slice(0, 10);
  const todaysOrders = orders.filter((o) => isoDay(o.placedOn) === today);
  const todaysSales = todaysOrders.reduce((sum, o) => sum + o.total, 0);
  const todaysCollected = todaysOrders.reduce((sum, o) => sum + o.paid, 0);
  const stockValue = inventory.reduce((sum, i) => sum + i.quantity * i.purchasePrice, 0);
  const lowStockItems = inventory.filter((i) => i.quantity <= i.minStockLevel);
  const activeCustomers = customers.filter((c) => c.status === "active");

  const stats: StatItem[] = [
    {
      id: "sales",
      label: "Today's sales",
      value: formatCurrency(todaysSales),
      helper: `${todaysOrders.length} bills generated`,
      change: formatCurrency(todaysCollected) + " collected",
      trend: "up",
      icon: IndianRupee,
    },
    {
      id: "stock",
      label: "Stock value",
      value: formatCurrency(stockValue),
      helper: `${inventory.length} items tracked`,
      change: `${inventory.reduce((s, i) => s + i.quantity, 0)} units`,
      trend: "flat",
      icon: Package,
    },
    {
      id: "customers",
      label: "Active customers",
      value: String(activeCustomers.length),
      helper: `${customers.length} total in khata`,
      change: formatCurrency(customers.reduce((s, c) => s + c.currentDue, 0)) + " due",
      trend: "flat",
      icon: Users,
    },
    {
      id: "alerts",
      label: "Low stock alerts",
      value: String(lowStockItems.length),
      helper: "At or below reorder level",
      change: lowStockItems.length ? "Action needed" : "All healthy",
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
    supplierLedger.forEach((e) => {
      const m = bucket(e.date);
      if (m && e.type === "purchase") m.purchases += e.amount;
    });
    return months;
  }, [orders, supplierLedger]);

  const recentBills = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Shop overview"
        title={`${greeting()}${user ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Counter and online activity for AgriKisan Krishi Kendra, Hisar."
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={() => setDayCloseOpen(true)}>
              Day close summary
            </Button>
            <Button className="rounded-full" asChild>
              <Link to="/admin/sales">
                <Plus className="size-4" /> New sale bill
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-soft lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Sales vs purchases</CardTitle>
              <p className="text-xs text-muted-foreground">Last six months, in rupees</p>
            </div>
            <Badge variant="secondary">Live data</Badge>
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

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
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
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-soft lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent bills</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/sales">View all</Link>
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
                        {loading ? "Loading bills…" : "No bills recorded yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.code}</TableCell>
                        <TableCell>{bill.customerName || "Walk-in"}</TableCell>
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

        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Low stock alerts</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/inventory">Inventory</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {lowStockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Every item is above its reorder level.
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

          <Card className="shadow-soft">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Recent activity</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/activity-logs">All logs</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {activityLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
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
        </div>
      </div>

      <Dialog open={dayCloseOpen} onOpenChange={setDayCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Day close summary</DialogTitle>
            <DialogDescription>
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <SummaryRow label="Bills generated" value={String(todaysOrders.length)} />
            <SummaryRow label="Total sales" value={formatCurrency(todaysSales)} />
            <SummaryRow label="Amount collected" value={formatCurrency(todaysCollected)} />
            <SummaryRow
              label="Outstanding on today's bills"
              value={formatCurrency(Math.max(todaysSales - todaysCollected, 0))}
            />
            <SummaryRow
              label="Payments recorded today"
              value={String(payments.filter((p) => isoDay(p.date) === today).length)}
            />
            <SummaryRow label="Low stock items" value={String(lowStockItems.length)} />
          </div>
          <Button className="w-full rounded-full" onClick={() => window.print()}>
            Print summary
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
