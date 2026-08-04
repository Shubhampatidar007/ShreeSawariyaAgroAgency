import { IndianRupee, Package, Users, AlertTriangle } from "lucide-react";
import type { ActivityLog, Advertisement, Backup, SecurityLog, StatItem } from "@/types";

export const overviewStats: StatItem[] = [
  { id: "sales", label: "Today's sales", value: "₹1,84,250", helper: "42 bills generated", change: "+12.4%", trend: "up", icon: IndianRupee },
  { id: "stock", label: "Stock value", value: "₹27.6 L", helper: "1,248 SKUs tracked", change: "+3.1%", trend: "up", icon: Package },
  { id: "customers", label: "Active customers", value: "1,364", helper: "86 new this month", change: "+5.8%", trend: "up", icon: Users },
  { id: "alerts", label: "Low stock alerts", value: "23", helper: "9 below reorder level", change: "-4 items", trend: "down", icon: AlertTriangle },
];

export const salesTrend = [
  { month: "Feb", sales: 620000, purchases: 410000 },
  { month: "Mar", sales: 748000, purchases: 502000 },
  { month: "Apr", sales: 812000, purchases: 468000 },
  { month: "May", sales: 690000, purchases: 512000 },
  { month: "Jun", sales: 985000, purchases: 640000 },
  { month: "Jul", sales: 1124000, purchases: 702000 },
];

export const categorySplit = [
  { category: "Seeds", value: 38 },
  { category: "Fertilizers", value: 27 },
  { category: "Pesticides", value: 19 },
  { category: "Tools", value: 9 },
  { category: "Irrigation", value: 7 },
];

export const recentBills = [
  { id: "INV-24817", customer: "Ramesh Yadav", village: "Barwala", items: 6, amount: "₹12,480", mode: "Cash", status: "Paid" },
  { id: "INV-24816", customer: "Sunita Devi", village: "Adampur", items: 3, amount: "₹4,150", mode: "UPI", status: "Paid" },
  { id: "INV-24815", customer: "Gurmeet Singh", village: "Narnaund", items: 11, amount: "₹38,900", mode: "Khata", status: "Pending" },
  { id: "INV-24814", customer: "Mahesh Kumar", village: "Uklana", items: 2, amount: "₹2,760", mode: "Card", status: "Paid" },
  { id: "INV-24813", customer: "Kisan Seva Society", village: "Hansi", items: 24, amount: "₹1,04,300", mode: "Cheque", status: "Partial" },
];

export const lowStockItems = [
  { name: "DAP 18:46:0", stock: 12, reorder: 40, unit: "bags" },
  { name: "Paddy Seed PR-126", stock: 8, reorder: 30, unit: "bags" },
  { name: "Chlorpyriphos 20% EC", stock: 5, reorder: 25, unit: "litres" },
  { name: "Sprinkler Nozzle 20mm", stock: 18, reorder: 60, unit: "pcs" },
];

export const activityLogs: ActivityLog[] = [
  { id: "a1", actor: "Anil Verma", action: "Created purchase order", target: "PO-1187 · IFFCO", module: "Suppliers", timestamp: "Today, 05:42 PM", severity: "info" },
  { id: "a2", actor: "Priya Sharma", action: "Updated price list", target: "Fertilizers · 24 SKUs", module: "Products", timestamp: "Today, 04:18 PM", severity: "warning" },
  { id: "a3", actor: "Anil Verma", action: "Generated invoice", target: "INV-24817", module: "Sales", timestamp: "Today, 03:55 PM", severity: "success" },
  { id: "a4", actor: "System", action: "Completed nightly backup", target: "agrikisan_db_0804", module: "Backups", timestamp: "Today, 02:00 AM", severity: "success" },
  { id: "a5", actor: "Kavita Rani", action: "Deleted draft advertisement", target: "Monsoon Combo Offer", module: "Advertisements", timestamp: "Yesterday, 07:12 PM", severity: "critical" },
  { id: "a6", actor: "Anil Verma", action: "Adjusted stock count", target: "Urea 46% · -6 bags", module: "Inventory", timestamp: "Yesterday, 06:30 PM", severity: "warning" },
];

export const securityLogs: SecurityLog[] = [
  { id: "s1", event: "Successful login", account: "anil@agrikisan.in", ip: "103.21.58.14", device: "Chrome · Windows", location: "Hisar, HR", timestamp: "Today, 08:02 AM", severity: "success", status: "allowed" },
  { id: "s2", event: "Failed login attempt (3x)", account: "billing@agrikisan.in", ip: "45.118.92.7", device: "Firefox · Linux", location: "Unknown", timestamp: "Today, 03:14 AM", severity: "critical", status: "blocked" },
  { id: "s3", event: "Password changed", account: "priya@agrikisan.in", ip: "103.21.58.14", device: "Safari · iOS", location: "Hisar, HR", timestamp: "Yesterday, 09:40 PM", severity: "warning", status: "allowed" },
  { id: "s4", event: "New device authorised", account: "kavita@agrikisan.in", ip: "49.36.184.22", device: "Chrome · Android", location: "Hansi, HR", timestamp: "Yesterday, 05:05 PM", severity: "info", status: "review" },
  { id: "s5", event: "Role permission updated", account: "anil@agrikisan.in", ip: "103.21.58.14", device: "Chrome · Windows", location: "Hisar, HR", timestamp: "02 Aug, 11:20 AM", severity: "warning", status: "allowed" },
];

export const advertisements: Advertisement[] = [
  { id: "ad1", title: "Kharif Seed Festival — 15% off", placement: "Homepage hero", audience: "All visitors", status: "live", impressions: 18420, clicks: 1264, runsUntil: "31 Aug 2026" },
  { id: "ad2", title: "Buy 10 Urea bags, get spray free", placement: "Category banner", audience: "Wheat growers", status: "live", impressions: 9640, clicks: 712, runsUntil: "20 Aug 2026" },
  { id: "ad3", title: "Drip irrigation subsidy camp", placement: "Storefront strip", audience: "Repeat customers", status: "scheduled", impressions: 0, clicks: 0, runsUntil: "05 Sep 2026" },
  { id: "ad4", title: "Cattle feed monsoon combo", placement: "Product sidebar", audience: "Dairy farmers", status: "paused", impressions: 4310, clicks: 188, runsUntil: "12 Aug 2026" },
  { id: "ad5", title: "Rabi advance booking 2025", placement: "Homepage hero", audience: "All visitors", status: "expired", impressions: 26890, clicks: 2140, runsUntil: "30 Nov 2025" },
];

export const backups: Backup[] = [
  { id: "b1", name: "agrikisan_db_0804_0200", type: "automatic", size: "412 MB", createdAt: "04 Aug 2026, 02:00 AM", status: "completed", destination: "Cloud vault" },
  { id: "b2", name: "agrikisan_db_0803_0200", type: "automatic", size: "408 MB", createdAt: "03 Aug 2026, 02:00 AM", status: "completed", destination: "Cloud vault" },
  { id: "b3", name: "pre_pricelist_update", type: "manual", size: "405 MB", createdAt: "02 Aug 2026, 11:12 AM", status: "completed", destination: "Local drive" },
  { id: "b4", name: "agrikisan_db_0801_0200", type: "automatic", size: "399 MB", createdAt: "01 Aug 2026, 02:00 AM", status: "failed", destination: "Cloud vault" },
];

export const quickActions = [
  { title: "New sale bill", description: "Create a counter invoice", to: "/admin/sales" },
  { title: "Add product", description: "List a new item in catalogue", to: "/admin/products" },
  { title: "Stock entry", description: "Record incoming supplier stock", to: "/admin/inventory" },
  { title: "Run backup", description: "Take a manual data snapshot", to: "/admin/backups" },
];
