import { useState } from "react";
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
import {
  bestCustomers,
  productMovement,
  revenueTrend,
  salesHeatmap,
  topCategories,
  topProducts,
} from "@/data/operations";
import { formatCurrency, useShopStore } from "@/lib/shop-store";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Admin" },
      {
        name: "description",
        content: "Revenue trends, product movement, category mix and customer analytics.",
      },
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

function AnalyticsPage() {
  const { t } = useI18n();
  const orders = useShopStore((s) => s.orders);
  const customers = useShopStore((s) => s.customers);
  const [range, setRange] = useState<DateRangeKey>("monthly");
  const [custom, setCustom] = useState<CustomRange>({ from: "", to: "" });

  const revenue = revenueTrend.reduce((s, r) => s + r.sales, 0);
  const profit = revenueTrend.reduce((s, r) => s + r.profit, 0);
  const avgOrder = orders.length ? orders.reduce((s, o) => s + o.total, 0) / orders.length : 0;

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: t("common.admin"), to: "/admin" }, { label: t("common.analytics") }]}
        eyebrow={t("common.insights")}
        title={t("analytics.title")}
        description={t("analytics.description")}
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
          { label: t("analytics.revenue6m"), value: formatCurrency(revenue), icon: IndianRupee, tone: "success" },
          { label: t("analytics.grossProfit"), value: formatCurrency(profit), icon: TrendingUp },
          { label: t("analytics.avgOrderValue"), value: formatCurrency(avgOrder), icon: ShoppingBag },
          { label: t("analytics.activeCustomers"), value: String(customers.length), icon: Users },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title={t("analytics.revenueVsPurchases")} description={t("analytics.revenueVsPurchasesDescription")}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="period" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="var(--color-primary)"
                fill="url(#salesFill)"
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="var(--color-chart-3)"
                fillOpacity={0}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("analytics.stockMovement")} description={t("analytics.stockMovementDescription")}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={productMovement}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="product" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="inward" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="outward" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("analytics.categoryMix")} description={t("analytics.categoryMixDescription")}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={topCategories}
                dataKey="value"
                nameKey="category"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
              >
                {topCategories.map((entry, index) => (
                  <Cell key={entry.category} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("analytics.salesHeatmap")} description={t("analytics.salesHeatmapDescription")}>
          <div className="space-y-2">
            <div className="grid grid-cols-[3rem_repeat(4,1fr)] gap-2 text-[11px] text-muted-foreground">
              <span />
              <span>{t("analytics.morning")}</span>
              <span>{t("analytics.midday")}</span>
              <span>{t("analytics.evening")}</span>
              <span>{t("analytics.night")}</span>
            </div>
            {salesHeatmap.map((row) => (
              <div key={row.day} className="grid grid-cols-[3rem_repeat(4,1fr)] items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{row.day}</span>
                {row.slots.map((slot, index) => (
                  <div
                    key={index}
                    className="rounded-lg py-2.5 text-center text-[11px] font-semibold text-foreground"
                    style={{
                      backgroundColor: `color-mix(in oklab, var(--color-primary) ${Math.min(
                        slot * 1.5,
                        90,
                      )}%, transparent)`,
                    }}
                  >
                    {slot}
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
                      className={`text-right font-semibold ${
                        product.growth.startsWith("-") ? "text-destructive" : "text-primary"
                      }`}
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
                  <TableRow key={customer.name}>
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
