import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IndianRupee, ShoppingBag, TrendingUp, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { ChartCard } from "@/components/shared/ChartCard";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { RangeFilter, type CustomRange, type DateRangeKey } from "@/components/shared/RangeFilter";
import { buildDailyMetrics, dateInRange, isoDay } from "@/lib/business-metrics";
import { formatCurrency, shopStore, useShopStore } from "@/lib/shop-store";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Admin" },
      { name: "description", content: "Live revenue, product, category and customer analytics." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

const pieColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];
type ProductSummary = { name: string; units: number; revenue: number; growth: string };
type CustomerSummary = { name: string; village: string; orders: number; spend: number };

function AnalyticsPage() {
  const { t } = useI18n();
  const store = useShopStore((s) => s);
  const [range, setRange] = useState<DateRangeKey>("monthly");
  const [custom, setCustom] = useState<CustomRange>({ from: "", to: "" });

  useEffect(() => {
    if (store.customerSaleItems.length > 0) return;
    void shopStore.reload().catch((error) => {
      console.error("Failed to load historical sale snapshots for analytics:", error);
    });
  }, []);

  const metrics = useMemo(
    () =>
      buildDailyMetrics(
        store.orders,
        store.customerLedger,
        store.customerSaleItems,
        store.supplierLedger,
        store.inventory,
        range,
        custom,
      ),
    [
      store.orders,
      store.customerLedger,
      store.customerSaleItems,
      store.supplierLedger,
      store.inventory,
      range,
      custom,
    ],
  );
  const inRange = (value: string) => dateInRange(value, range, custom);
  const revenue = metrics.reduce((sum, row) => sum + row.sales, 0);
  const profit = metrics.reduce((sum, row) => sum + row.profit, 0);
  const filteredOrders = store.orders.filter((order) => inRange(order.placedOn));
  const avgOrder = filteredOrders.length
    ? filteredOrders.reduce((sum, order) => sum + order.total, 0) / filteredOrders.length
    : 0;
  const activeCustomers = store.customers.filter((customer) => customer.status === "active").length;

  const stockMovement = useMemo(() => {
    const map = new Map<string, { onHand: number; outward: number }>();
    store.inventory.forEach((item) => {
      map.set(item.productName, { onHand: item.quantity, outward: 0 });
    });
    const ensure = (name: string) => {
      const key = name.trim() || "Unknown";
      const row = map.get(key) ?? { onHand: 0, outward: 0 };
      map.set(key, row);
      return row;
    };
    store.orders.forEach((order) => {
      if (!inRange(order.placedOn)) return;
      order.items.forEach((item) => {
        ensure(item.product).outward += item.quantity;
      });
    });
    store.customerLedger.forEach((entry) => {
      if ((entry.entryType as string) === "sale" && inRange(entry.date))
        ensure(entry.product).outward += entry.quantity;
    });
    return [...map.entries()]
      .map(([product, row]) => ({ product, ...row }))
      .sort((a, b) => b.outward - a.outward)
      .slice(0, 10);
  }, [store.inventory, store.orders, store.customerLedger, range, custom]);

  const categoryMix = useMemo(() => {
    const categoryByProduct = new Map(
      store.products.map((product) => [
        product.title.trim().toLowerCase(),
        product.category || "Other",
      ]),
    );
    const totals = new Map<string, number>();
    const add = (product: string, amount: number) => {
      const category = categoryByProduct.get(product.trim().toLowerCase()) ?? "Other";
      totals.set(category, (totals.get(category) ?? 0) + amount);
    };
    store.orders.forEach((order) => {
      if (!inRange(order.placedOn)) return;
      order.items.forEach((item) => add(item.product, item.amount));
    });
    store.customerLedger.forEach((entry) => {
      if ((entry.entryType as string) === "sale" && inRange(entry.date))
        add(entry.product, entry.amount);
    });
    const rows = [...totals.entries()].map(([category, value]) => ({ category, value }));
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    return rows
      .map((row) => ({ ...row, value: total ? Math.round((row.value / total) * 100) : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [store.products, store.orders, store.customerLedger, range, custom]);

  const salesHeatmap = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const slots = ["Morning", "Midday", "Evening", "Night"];
    const data = new Map(days.map((day) => [day, new Array(slots.length).fill(0) as number[]]));
    store.orders.forEach((order) => {
      if (!inRange(order.placedOn)) return;
      const date = new Date(order.placedOn);
      const dayIndex = (date.getDay() + 6) % 7;
      const hour = date.getHours();
      const slotIndex = hour < 11 ? 0 : hour < 15 ? 1 : hour < 19 ? 2 : 3;
      data.get(days[dayIndex])![slotIndex] += order.total;
    });
    return days.map((day) => ({ day, slots: data.get(day)! }));
  }, [store.orders, range, custom]);

  const topProducts = useMemo<ProductSummary[]>(() => {
    const totals = new Map<
      string,
      { units: number; revenue: number; recent: number; older: number }
    >();
    const ensure = (name: string) => {
      const row = totals.get(name) ?? { units: 0, revenue: 0, recent: 0, older: 0 };
      totals.set(name, row);
      return row;
    };
    const dates = filteredOrders.map((order) => isoDay(order.placedOn)).sort();
    const split = dates.length ? dates[Math.floor(dates.length / 2)]! : "";
    filteredOrders.forEach((order) =>
      order.items.forEach((item) => {
        const row = ensure(item.product);
        row.units += item.quantity;
        row.revenue += item.amount;
        if (isoDay(order.placedOn) >= split) row.recent += item.amount;
        else row.older += item.amount;
      }),
    );
    store.customerLedger
      .filter((entry) => (entry.entryType as string) === "sale" && inRange(entry.date))
      .forEach((entry) => {
        const row = ensure(entry.product);
        row.units += entry.quantity;
        row.revenue += entry.amount;
        if (isoDay(entry.date) >= split) row.recent += entry.amount;
        else row.older += entry.amount;
      });
    return [...totals.entries()]
      .map(([name, row]) => ({
        name,
        units: row.units,
        revenue: row.revenue,
        growth:
          row.older === 0
            ? row.recent
              ? "+100%"
              : "0%"
            : `${row.recent >= row.older ? "+" : ""}${Math.round(((row.recent - row.older) / row.older) * 100)}%`,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [filteredOrders, store.customerLedger, range, custom]);

  const bestCustomers = useMemo<CustomerSummary[]>(() => {
    const rows = new Map<string, CustomerSummary>();
    const people = new Map(store.customers.map((customer) => [customer.id, customer]));
    const ensure = (id: string, name: string, village: string) => {
      const row = rows.get(id) ?? { name, village, orders: 0, spend: 0 };
      rows.set(id, row);
      return row;
    };
    filteredOrders.forEach((order) => {
      const customer = order.customerId ? people.get(order.customerId) : undefined;
      const row = ensure(
        order.customerId ?? `guest:${order.customerName}`,
        customer?.name ?? order.customerName,
        customer?.village ?? order.village,
      );
      row.orders += 1;
      row.spend += order.total;
    });
    store.customerLedger
      .filter((entry) => (entry.entryType as string) === "sale" && inRange(entry.date))
      .forEach((entry) => {
        const customer = people.get(entry.customerId);
        const row = ensure(
          entry.customerId,
          customer?.name ?? entry.customerId,
          customer?.village ?? "",
        );
        row.orders += 1;
        row.spend += entry.amount;
      });
    return [...rows.values()].sort((a, b) => b.spend - a.spend).slice(0, 8);
  }, [filteredOrders, store.customers, store.customerLedger, range, custom]);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: t("common.admin"), to: "/admin" }, { label: t("common.analytics") }]}
        eyebrow={t("common.insights")}
        title={t("analytics.title")}
        description="Live analytics calculated from orders, khata sales, supplier purchases, inventory and customer records."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RangeFilter
              value={range}
              onChange={setRange}
              custom={custom}
              onCustomChange={setCustom}
            />
            <ExportMenu />
          </div>
        }
      />
      <SummaryCards
        items={[
          {
            label: t("analytics.revenue6m"),
            value: formatCurrency(revenue),
            icon: IndianRupee,
            tone: "success",
          },
          { label: t("analytics.grossProfit"), value: formatCurrency(profit), icon: TrendingUp },
          {
            label: t("analytics.avgOrderValue"),
            value: formatCurrency(avgOrder),
            icon: ShoppingBag,
          },
          { label: t("analytics.activeCustomers"), value: String(activeCustomers), icon: Users },
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          title={t("analytics.revenueVsPurchases")}
          description="Sales and supplier purchases from live records."
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="var(--color-primary)"
                fillOpacity={0.16}
                fill="var(--color-primary)"
              />
              <Area
                type="monotone"
                dataKey="purchases"
                stroke="var(--color-chart-3)"
                fillOpacity={0}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="Stock on hand vs sales"
          description="Current inventory quantity compared with filtered outward sales."
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stockMovement}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="product" stroke="var(--color-muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="onHand"
                name="On hand"
                fill="var(--color-chart-2)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="outward"
                name="Sales"
                fill="var(--color-primary)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title={t("analytics.categoryMix")}
          description="Share of filtered sales revenue by published product category."
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryMix}
                dataKey="value"
                nameKey="category"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
              >
                {categoryMix.map((entry, index) => (
                  <Cell key={entry.category} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title={t("analytics.salesHeatmap")}
          description="Order value by day and time of day."
        >
          <div className="space-y-2">
            <div className="grid grid-cols-[3rem_repeat(4,1fr)] gap-2 text-[11px] text-muted-foreground">
              <span />
              {["Morning", "Midday", "Evening", "Night"].map((slot) => (
                <span key={slot}>{slot}</span>
              ))}
            </div>
            {salesHeatmap.map((row) => (
              <div key={row.day} className="grid grid-cols-[3rem_repeat(4,1fr)] items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{row.day}</span>
                {row.slots.map((slot, index) => (
                  <div
                    key={index}
                    className="rounded-lg py-2.5 text-center text-[11px] font-semibold"
                    style={{
                      backgroundColor: `color-mix(in oklab, var(--color-primary) ${Math.min(slot / 10, 90)}%, transparent)`,
                    }}
                  >
                    {formatCurrency(slot)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="shadow-soft">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("analytics.topProduct")}</TableHead>
                  <TableHead className="text-right">{t("analytics.units")}</TableHead>
                  <TableHead className="text-right">{t("reports.revenue")}</TableHead>
                  <TableHead className="text-right">{t("analytics.growth")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((product) => (
                  <TableRow key={product.name}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">{product.units}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                    <TableCell
                      className={`text-right font-semibold ${product.growth.startsWith("-") ? "text-destructive" : "text-primary"}`}
                    >
                      {product.growth}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("analytics.bestCustomer")}</TableHead>
                  <TableHead>{t("reports.village")}</TableHead>
                  <TableHead className="text-right">{t("analytics.orders")}</TableHead>
                  <TableHead className="text-right">{t("analytics.spend")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bestCustomers.map((customer) => (
                  <TableRow key={`${customer.name}-${customer.village}`}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.village}</TableCell>
                    <TableCell className="text-right">{customer.orders}</TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.spend)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
