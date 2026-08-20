import { useMemo } from "react";
import { Package, Percent, TrendingUp, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOverviewStore } from "@/lib/admin-overview-store";
import { formatIndianCompactCurrency, formatIndianQuantity } from "@/lib/indian-format";

export function DashboardEnhancementsOptimized() {
  const { orders, customerLedger, inventory, customers, loading } = useOverviewStore((s) => s);
  const inventoryCostByName = useMemo(
    () =>
      new Map(inventory.map((item) => [item.productName.trim().toLowerCase(), item.purchasePrice])),
    [inventory],
  );
  const productProfit = useMemo(() => {
    const map = new Map<
      string,
      { name: string; quantity: number; revenue: number; cost: number }
    >();
    const ensure = (name: string) => {
      const key = name.trim().toLowerCase();
      const current = map.get(key) ?? {
        name: name.trim() || "Unknown product",
        quantity: 0,
        revenue: 0,
        cost: 0,
      };
      map.set(key, current);
      return current;
    };
    orders.forEach((order) => {
      const subtotal = order.items.reduce((sum, item) => sum + item.amount, 0);
      const netSubtotal = Math.max(order.subtotal - order.discount, 0);
      order.items.forEach((item) => {
        const row = ensure(item.product);
        row.quantity += item.quantity;
        row.revenue += subtotal > 0 ? (item.amount / subtotal) * netSubtotal : item.amount;
        row.cost +=
          item.quantity * (inventoryCostByName.get(item.product.trim().toLowerCase()) ?? 0);
      });
    });
    customerLedger
      .filter((entry) => (entry.entryType as string) === "sale")
      .forEach((entry) => {
        const row = ensure(entry.product);
        row.quantity += entry.quantity;
        row.revenue += entry.amount;
        row.cost +=
          entry.quantity * (inventoryCostByName.get(entry.product.trim().toLowerCase()) ?? 0);
      });
    return [...map.values()]
      .map((row) => ({ ...row, profit: row.revenue - row.cost }))
      .filter((row) => row.revenue || row.cost)
      .sort((a, b) => b.profit - a.profit);
  }, [customerLedger, inventoryCostByName, orders]);
  const topProduct = productProfit[0];
  const totals = productProfit.reduce(
    (acc, row) => ({ revenue: acc.revenue + row.revenue, profit: acc.profit + row.profit }),
    { revenue: 0, profit: 0 },
  );
  const grossMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;
  const outstanding = customers.reduce((sum, customer) => sum + customer.currentDue, 0);
  const stockValue = inventory.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);

  const cards = [
    {
      label: "Top profit product",
      title: topProduct?.name ?? "No sales yet",
      value: topProduct ? formatIndianCompactCurrency(topProduct.profit) : "₹0",
      helper: topProduct
        ? `${formatIndianQuantity(topProduct.quantity)} sold · ${formatIndianCompactCurrency(topProduct.revenue)} revenue`
        : "Create a sale to start product profitability tracking",
      icon: TrendingUp,
    },
    {
      label: "Gross margin",
      title: "Across recorded sales",
      value: `${grossMargin.toFixed(1)}%`,
      helper: `${formatIndianCompactCurrency(totals.profit)} profit on ${formatIndianCompactCurrency(totals.revenue)} revenue`,
      icon: Percent,
    },
    {
      label: "Customer outstanding",
      title: "Receivables",
      value: formatIndianCompactCurrency(outstanding),
      helper: `${customers.filter((customer) => customer.currentDue > 0).length} customer account(s) with dues`,
      icon: WalletCards,
    },
    {
      label: "Inventory value",
      title: "Current stock at purchase cost",
      value: formatIndianCompactCurrency(stockValue),
      helper: `${formatIndianQuantity(inventory.reduce((sum, item) => sum + item.quantity, 0))} total units across ${inventory.length} items`,
      icon: Package,
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">Quick insights</h2>
        <p className="text-xs text-muted-foreground">
          Business signals calculated from the dashboard dataset.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="overflow-hidden shadow-soft">
              <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {card.label}
                  </p>
                  <CardTitle className="mt-2 line-clamp-2 text-base leading-5">
                    {loading ? "Loading…" : card.title}
                  </CardTitle>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tracking-tight text-primary">
                  {loading ? "—" : card.value}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {loading ? "Loading dashboard insights" : card.helper}
                </p>
                {card.label === "Top profit product" && topProduct ? (
                  <Badge variant="secondary" className="mt-3 rounded-full">
                    {topProduct.profit >= 0 ? "Highest recorded profit" : "Highest recorded loss"}
                  </Badge>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
