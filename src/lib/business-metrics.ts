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

const METRICS_CACHE_LIMIT = 6;

type MetricsCacheEntry = {
  orders: Order[];
  customerLedger: CustomerLedgerEntry[];
  supplierLedger: SupplierLedgerEntry[];
  inventory: InventoryItem[];
  range: MetricsRange;
  customFrom: string;
  customTo: string;
  result: DailyMetric[];
};

// Derived metrics are pure for a given set of store-array references. Keep a small
// bounded cache so repeated dashboard/analytics renders can reuse the same result.
const metricsCache: MetricsCacheEntry[] = [];

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

const findCachedMetrics = (
  orders: Order[],
  customerLedger: CustomerLedgerEntry[],
  supplierLedger: SupplierLedgerEntry[],
  inventory: InventoryItem[],
  range: MetricsRange,
  custom: MetricsCustomRange,
) =>
  metricsCache.find(
    (entry) =>
      entry.orders === orders &&
      entry.customerLedger === customerLedger &&
      entry.supplierLedger === supplierLedger &&
      entry.inventory === inventory &&
      entry.range === range &&
      entry.customFrom === custom.from &&
      entry.customTo === custom.to,
  )?.result;

export const buildDailyMetrics = (
  orders: Order[],
  customerLedger: CustomerLedgerEntry[],
  supplierLedger: SupplierLedgerEntry[],
  inventory: InventoryItem[],
  range: MetricsRange = "yearly",
  custom: MetricsCustomRange = { from: "", to: "" },
): DailyMetric[] => {
  const cached = findCachedMetrics(
    orders,
    customerLedger,
    supplierLedger,
    inventory,
    range,
    custom,
  );
  if (cached) return cached;

  const costByProduct = new Map(
    inventory.map((item) => [item.productName.trim().toLowerCase(), item.purchasePrice]),
  );
  const daily = new Map<string, { sales: number; purchases: number; cost: number }>();
  const ensure = (date: string) => {
    const row = daily.get(date) ?? { sales: 0, purchases: 0, cost: 0 };
    daily.set(date, row);
    return row;
  };

  const today = isoDay(new Date().toISOString());
  const rangeStart =
    range === "custom"
      ? custom.from
      : addDays(today, -({ daily: 1, weekly: 7, monthly: 30, yearly: 365 }[range] - 1));
  const rangeEnd = range === "custom" ? custom.to : today;
  const inRange = (value: string) => {
    const day = isoDay(value);
    if (rangeStart && day < rangeStart) return false;
    if (rangeEnd && day > rangeEnd) return false;
    return true;
  };

  orders.forEach((order) => {
    if (!inRange(order.placedOn)) return;
    const row = ensure(isoDay(order.placedOn));
    row.sales += order.total;
    row.cost += order.items.reduce(
      (sum, item) =>
        sum + item.quantity * (costByProduct.get(item.product.trim().toLowerCase()) ?? 0),
      0,
    );
  });

  customerLedger.forEach((entry) => {
    if ((entry.entryType as string) !== "sale" || !inRange(entry.date)) return;
    const row = ensure(isoDay(entry.date));
    row.sales += entry.amount;
    row.cost += entry.quantity * (costByProduct.get(entry.product.trim().toLowerCase()) ?? 0);
  });

  supplierLedger.forEach((entry) => {
    if (entry.type !== "purchase" || !inRange(entry.date)) return;
    const row = ensure(isoDay(entry.date));
    row.purchases += entry.amount;
  });

  const dates = [...daily.keys()].sort();
  const result: DailyMetric[] = [];

  if (dates.length) {
    for (let date = dates[0]!; date <= dates[dates.length - 1]!; date = addDays(date, 1)) {
      const row = daily.get(date) ?? { sales: 0, purchases: 0, cost: 0 };
      const profit = row.sales - row.cost;
      result.push({
        date,
        sales: row.sales,
        purchases: row.purchases,
        cost: row.cost,
        profit,
        margin: row.sales === 0 ? 0 : (profit / row.sales) * 100,
      });
    }
  }

  metricsCache.unshift({
    orders,
    customerLedger,
    supplierLedger,
    inventory,
    range,
    customFrom: custom.from,
    customTo: custom.to,
    result,
  });
  if (metricsCache.length > METRICS_CACHE_LIMIT) metricsCache.pop();

  return result;
};

export const getPurchaseCost = (productName: string, inventory: InventoryItem[]) => {
  const item = inventory.find(
    (entry) => entry.productName.trim().toLowerCase() === productName.trim().toLowerCase(),
  );
  return item?.purchasePrice ?? 0;
};
