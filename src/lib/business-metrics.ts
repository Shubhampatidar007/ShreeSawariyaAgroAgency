import type { CustomerLedgerEntry, InventoryItem, SupplierLedgerEntry } from "@/types/business";
import type { Order } from "@/types/operations";

export type MetricsRange = "daily" | "weekly" | "monthly" | "yearly" | "custom";
export type MetricsCustomRange = { from: string; to: string };

export type DailyMetric = {
  date: string;
  sales: number;
  purchases: number;
  cost: number;
  profit: number;
  margin: number;
};

export const isoDay = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const addDays = (day: string, amount: number) => {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(year, month - 1, date + amount);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
};

export const dateInRange = (value: string, range: MetricsRange, custom: MetricsCustomRange) => {
  if (range === "custom") {
    const day = isoDay(value);
    if (custom.from && day < custom.from) return false;
    if (custom.to && day > custom.to) return false;
    return true;
  }

  const today = isoDay(new Date().toISOString());
  const days = { daily: 1, weekly: 7, monthly: 30, yearly: 365 }[range];
  return isoDay(value) >= addDays(today, -(days - 1)) && isoDay(value) <= today;
};

export const buildDailyMetrics = (
  orders: Order[],
  customerLedger: CustomerLedgerEntry[],
  supplierLedger: SupplierLedgerEntry[],
  inventory: InventoryItem[],
  range: MetricsRange = "yearly",
  custom: MetricsCustomRange = { from: "", to: "" },
): DailyMetric[] => {
  const costByProduct = new Map(
    inventory.map((item) => [item.productName.trim().toLowerCase(), item.purchasePrice]),
  );
  const sales = customerLedger.filter((entry) => (entry.entryType as string) === "sale");
  const daily = new Map<string, { sales: number; purchases: number; cost: number }>();
  const ensure = (date: string) => {
    const row = daily.get(date) ?? { sales: 0, purchases: 0, cost: 0 };
    daily.set(date, row);
    return row;
  };

  orders.forEach((order) => {
    if (!dateInRange(order.placedOn, range, custom)) return;
    const row = ensure(isoDay(order.placedOn));
    row.sales += order.total;
    row.cost += order.items.reduce(
      (sum, item) => sum + item.quantity * (costByProduct.get(item.product.trim().toLowerCase()) ?? 0),
      0,
    );
  });

  sales.forEach((entry) => {
    if (!dateInRange(entry.date, range, custom)) return;
    const row = ensure(isoDay(entry.date));
    row.sales += entry.amount;
    row.cost += entry.quantity * (costByProduct.get(entry.product.trim().toLowerCase()) ?? 0);
  });

  supplierLedger.forEach((entry) => {
    if (entry.type !== "purchase" || !dateInRange(entry.date, range, custom)) return;
    const row = ensure(isoDay(entry.date));
    row.purchases += entry.amount;
  });

  const dates = [...daily.keys()].sort();
  if (!dates.length) return [];

  const rows: DailyMetric[] = [];
  for (let date = dates[0]!; date <= dates[dates.length - 1]!; date = addDays(date, 1)) {
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
};

export const getPurchaseCost = (productName: string, inventory: InventoryItem[]) => {
  const item = inventory.find((entry) => entry.productName.trim().toLowerCase() === productName.trim().toLowerCase());
  return item?.purchasePrice ?? 0;
};
