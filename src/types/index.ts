import type { LucideIcon } from "lucide-react";
import type { ProductVariant } from "./business";

export type NavItem = {
  label: string;
  labelKey?: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavSection = {
  title: string;
  titleKey?: string;
  items: NavItem[];
};

export type StatTrend = "up" | "down" | "flat";

export type StatItem = {
  id: string;
  label: string;
  value: string;
  helper: string;
  change: string;
  trend: StatTrend;
  icon: LucideIcon;
};

export type Category = {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  emoji: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  rating: number;
  stock: number;
  tag?: string;
  emoji: string;
  image?: string;
  variants?: ProductVariant[];
};

export type Backup = {
  id: string;
  name: string;
  type: "automatic" | "manual";
  size: string;
  createdAt: string;
  status: "completed" | "running" | "failed";
  destination: string;
};
export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "critical";
  link?: string;
  isRead: boolean;
  sourceId?: string;
  createdAt: string;
};
export type Reminder = {
  id: string;
  title: string;
  audience: string;
  target: string;
  filterSummary: string;
  schedule: string;
  channel: string;
  dueAmount: number;
  status: string;
  nextRun: string;
  message: string;
  sourceId?: string;
};
