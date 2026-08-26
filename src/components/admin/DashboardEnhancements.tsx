import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Package,
  Percent,
  Settings2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useShopStore } from "@/lib/shop-store";
import { loadAdminOverviewMetrics, getCachedAdminOverviewMetrics } from "@/lib/admin-overview-metrics";
import { formatIndianCompactCurrency, formatIndianQuantity } from "@/lib/indian-format";

type InsightId = "top-profit" | "margin" | "outstanding" | "stock-value";

type InsightPreference = {
  id: InsightId;
  visible: boolean;
};

const STORAGE_KEY = "agrishop-dashboard-insights-v1";

const DEFAULT_PREFERENCES: InsightPreference[] = [
  { id: "top-profit", visible: true },
  { id: "margin", visible: true },
  { id: "outstanding", visible: true },
  { id: "stock-value", visible: true },
];

const labels: Record<InsightId, string> = {
  "top-profit": "Top profit product",
  margin: "Gross margin",
  outstanding: "Customer outstanding",
  "stock-value": "Inventory value",
};

export function DashboardEnhancements() {
  const { inventory, customers } = useShopStore((s) => s);
  const [metrics, setMetrics] = useState(() => getCachedAdminOverviewMetrics());
  const [preferences, setPreferences] = useState<InsightPreference[]>(DEFAULT_PREFERENCES);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void loadAdminOverviewMetrics()
      .then((next) => {
        if (active) setMetrics(next);
      })
      .catch((error) => {
        console.error("Dashboard insight metrics load failed:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as InsightPreference[];
      if (Array.isArray(parsed) && parsed.every((item) => item && typeof item.id === "string")) {
        const normalized = DEFAULT_PREFERENCES.map(
          (fallback) => parsed.find((item) => item.id === fallback.id) ?? fallback,
        );
        setPreferences(normalized);
      }
    } catch {
      // Ignore malformed local preferences and keep safe defaults.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Storage may be unavailable in private browsing; dashboard still works in-memory.
    }
  }, [preferences]);

  const productProfit = metrics?.productProfit ?? [];
  const topProduct = productProfit[0] ?? null;
  const totals = productProfit.reduce(
    (acc, row) => ({ revenue: acc.revenue + row.revenue, profit: acc.profit + row.profit }),
    { revenue: 0, profit: 0 },
  );

  const grossMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;
  const outstanding = metrics?.today.customerDue ?? customers.reduce((sum, customer) => sum + customer.currentDue, 0);
  const customersWithDue =
    metrics?.today.customersWithDue ?? customers.filter((customer) => customer.currentDue > 0).length;
  const stockValue =
    metrics?.today.stockValue ?? inventory.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
  const stockUnits =
    metrics?.today.stockUnits ?? inventory.reduce((sum, item) => sum + item.quantity, 0);
  const stockCount = metrics?.today.stockCount ?? inventory.length;

  const values: Record<
    InsightId,
    {
      label: string;
      title: string;
      value: string;
      helper: string;
      icon: LucideIcon;
      accent: string;
    }
  > = {
    "top-profit": {
      label: "Top profit product",
      title: topProduct?.name ?? "No sales yet",
      value: topProduct ? formatIndianCompactCurrency(topProduct.profit) : "₹0",
      helper: topProduct
        ? `${formatIndianQuantity(topProduct.quantity)} sold · ${formatIndianCompactCurrency(topProduct.revenue)} revenue`
        : "Create a sale to start product profitability tracking",
      icon: TrendingUp,
      accent: topProduct && topProduct.profit >= 0 ? "text-primary" : "text-destructive",
    },
    margin: {
      label: "Gross margin",
      title: "Across recorded sales",
      value: `${grossMargin.toFixed(1)}%`,
      helper: `${formatIndianCompactCurrency(totals.profit)} profit on ${formatIndianCompactCurrency(totals.revenue)} revenue`,
      icon: Percent,
      accent: grossMargin >= 0 ? "text-primary" : "text-destructive",
    },
    outstanding: {
      label: "Customer outstanding",
      title: "Receivables",
      value: formatIndianCompactCurrency(outstanding),
      helper: `${customersWithDue} customer account(s) with dues`,
      icon: WalletCards,
      accent: outstanding > 0 ? "text-warning" : "text-primary",
    },
    "stock-value": {
      label: "Inventory value",
      title: "Current stock at purchase cost",
      value: formatIndianCompactCurrency(stockValue),
      helper: `${formatIndianQuantity(stockUnits)} total units across ${stockCount} items`,
      icon: Package,
      accent: "text-primary",
    },
  };

  const visible = preferences.filter((item) => item.visible);

  const move = (id: InsightId, direction: -1 | 1) => {
    setPreferences((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const toggle = (id: InsightId) => {
    setPreferences((current) =>
      current.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item)),
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">Quick insights</h2>
          <p className="text-xs text-muted-foreground">
            Customize the business signals you want to see on your dashboard.
          </p>
        </div>
        <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full rounded-full sm:w-auto">
              <Settings2 className="size-4" />
              Customize dashboard
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle>Customize dashboard</DialogTitle>
              <DialogDescription>
                Choose which insight cards appear and change their order. Your preference is saved
                on this device.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {preferences.map((item, index) => {
                const Icon = values[item.id].icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border border-border p-3"
                  >
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ${values[item.id].accent}`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{labels[item.id]}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      onClick={() => toggle(item.id)}
                      aria-label={`${item.visible ? "Hide" : "Show"} ${labels[item.id]}`}
                    >
                      {item.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      disabled={index === 0}
                      onClick={() => move(item.id, -1)}
                      aria-label={`Move ${labels[item.id]} up`}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      disabled={index === preferences.length - 1}
                      onClick={() => move(item.id, 1)}
                      aria-label={`Move ${labels[item.id]} down`}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {visible.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex min-h-28 items-center justify-center text-center text-sm text-muted-foreground">
            All optional insight cards are hidden. Open Customize dashboard to restore one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((item) => {
            const insight = values[item.id];
            const Icon = insight.icon;
            return (
              <Card
                key={item.id}
                className="group overflow-hidden shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {insight.label}
                    </p>
                    <CardTitle className="mt-2 line-clamp-2 text-base leading-5">
                      {insight.title}
                    </CardTitle>
                  </div>
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ${insight.accent}`}
                  >
                    <Icon className="size-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold tracking-tight ${insight.accent}`}>
                    {insight.value}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{insight.helper}</p>
                  {item.id === "top-profit" && topProduct ? (
                    <Badge variant="secondary" className="mt-3 rounded-full">
                      {topProduct.profit >= 0 ? "Highest recorded profit" : "Highest recorded loss"}
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
