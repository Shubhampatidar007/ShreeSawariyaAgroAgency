import { supabase } from "@/integrations/supabase/client";

export type AdminOverviewDailyMetric = {
  date: string;
  sales: number;
  purchases: number;
  cost: number;
  profit: number;
  margin: number;
};

export type AdminOverviewProductProfit = {
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
};

export type AdminOverviewMetrics = {
  dailyRows: AdminOverviewDailyMetric[];
  productProfit: AdminOverviewProductProfit[];
  today: {
    sales: number;
    collected: number;
    billCount: number;
    cost: number;
    profit: number;
    paymentsCount: number;
    stockValue: number;
    stockCount: number;
    stockUnits: number;
    lowStockCount: number;
    activeCustomers: number;
    customerCount: number;
    customerDue: number;
    customersWithDue: number;
  };
};

const EMPTY_METRICS: AdminOverviewMetrics = {
  dailyRows: [],
  productProfit: [],
  today: {
    sales: 0,
    collected: 0,
    billCount: 0,
    cost: 0,
    profit: 0,
    paymentsCount: 0,
    stockValue: 0,
    stockCount: 0,
    stockUnits: 0,
    lowStockCount: 0,
    activeCustomers: 0,
    customerCount: 0,
    customerDue: 0,
    customersWithDue: 0,
  },
};

let cachedMetrics: AdminOverviewMetrics | null = null;
let inFlight: Promise<AdminOverviewMetrics> | null = null;

const normalize = (value: unknown): AdminOverviewMetrics => {
  if (!value || typeof value !== "object") return EMPTY_METRICS;
  const raw = value as Partial<AdminOverviewMetrics>;
  return {
    dailyRows: Array.isArray(raw.dailyRows) ? raw.dailyRows : [],
    productProfit: Array.isArray(raw.productProfit) ? raw.productProfit : [],
    today: { ...EMPTY_METRICS.today, ...(raw.today ?? {}) },
  };
};

export async function loadAdminOverviewMetrics({ force = false } = {}) {
  if (!force && cachedMetrics) return cachedMetrics;
  if (inFlight) return inFlight;

  inFlight = supabase.rpc("get_admin_overview_metrics").then(({ data, error }) => {
    if (error) throw error;
    cachedMetrics = normalize(data);
    return cachedMetrics;
  }).finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export function getCachedAdminOverviewMetrics() {
  return cachedMetrics;
}

export function invalidateAdminOverviewMetrics() {
  cachedMetrics = null;
}
