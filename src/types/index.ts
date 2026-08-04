import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavSection = {
  title: string;
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
};

export type LogSeverity = "info" | "success" | "warning" | "critical";

export type ActivityLog = {
  id: string;
  actor: string;
  action: string;
  target: string;
  module: string;
  timestamp: string;
  severity: LogSeverity;
};

export type SecurityLog = {
  id: string;
  event: string;
  account: string;
  ip: string;
  device: string;
  location: string;
  timestamp: string;
  severity: LogSeverity;
  status: "allowed" | "blocked" | "review";
};

export type Advertisement = {
  id: string;
  title: string;
  placement: string;
  audience: string;
  status: "live" | "scheduled" | "paused" | "expired";
  impressions: number;
  clicks: number;
  runsUntil: string;
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
