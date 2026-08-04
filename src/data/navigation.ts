import {
  LayoutDashboard,
  Users,
  Truck,
  Boxes,
  Package,
  ReceiptText,
  FileBarChart,
  LineChart,
  Megaphone,
  DatabaseBackup,
  History,
  ShieldAlert,
  Search,
  Settings,
} from "lucide-react";
import type { NavSection } from "@/types";

export const adminNavSections: NavSection[] = [
  {
    title: "Shop",
    items: [
      { label: "Overview", to: "/admin", icon: LayoutDashboard },
      { label: "Customers", to: "/admin/customers", icon: Users },
      { label: "Suppliers", to: "/admin/suppliers", icon: Truck },
      { label: "Inventory", to: "/admin/inventory", icon: Boxes },
      { label: "Products", to: "/admin/products", icon: Package },
      { label: "Sales", to: "/admin/sales", icon: ReceiptText },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", to: "/admin/reports", icon: FileBarChart },
      { label: "Analytics", to: "/admin/analytics", icon: LineChart },
      { label: "Advertisements", to: "/admin/advertisements", icon: Megaphone },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Backups", to: "/admin/backups", icon: DatabaseBackup },
      { label: "Activity Logs", to: "/admin/activity-logs", icon: History },
      { label: "Security Logs", to: "/admin/security-logs", icon: ShieldAlert },
      { label: "Search", to: "/admin/search", icon: Search },
      { label: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
];

export const storefrontNav = [
  { label: "Home", to: "/" },
  { label: "Categories", to: "/#categories" },
  { label: "Products", to: "/#products" },
  { label: "Offers", to: "/#offers" },
  { label: "About", to: "/#about" },
  { label: "Contact", to: "/#contact" },
];
