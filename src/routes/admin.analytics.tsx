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

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — AgriKisan Admin" },
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
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Analytics" }]}
        eyebrow="Insights"
        title="Business analytics"
        description="Revenue, product movement, category mix and customer performance."
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
          { label: "Revenue (6 mo)", value: formatCurrency(revenue), icon: IndianRupee, tone: "success" },
          { label: "Gross profit", value: formatCurrency(profit), icon: TrendingUp },
          { label: "Avg. order value", value: formatCurrency(avgOrder), icon: ShoppingBag },
          { label: "Active customers", value: String(customers.length), icon: Users },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Revenue vs purchases" description="Monthly trend with profit overlay">
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

        <ChartCard title="Stock movement" description="Inward vs outward quantity by product">
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

        <ChartCard title="Category mix" description="Share of revenue by category">
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

        <ChartCard title="Sales heatmap" description="Busiest days and time slots at the counter">
          <div className="space-y-2">
            <div className="grid grid-cols-[3rem_repeat(4,1fr)] gap-2 text-[11px] text-muted-foreground">
              <span />
              <span>Morning</span>
              <span>Midday</span>
              <span>Evening</span>
              <span>Night</span>
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
                  <TableHead>Top product</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Growth</TableHead>
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
                  <TableHead>Best customer</TableHead>
                  <TableHead>Village</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
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
