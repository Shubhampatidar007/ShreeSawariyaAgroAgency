import {
  LayoutDashboard,
  Users,
  Truck,
  Boxes,
  Package,
  ReceiptText,
  Wallet,
  FileBarChart,
  LineChart,
  Megaphone,
  LayoutTemplate,
  BellRing,
  DatabaseBackup,
  Search,
} from "lucide-react";
import type { NavSection } from "@/types";

export const adminNavSections: NavSection[] = [
  {
    title: "Shop",
    titleKey: "nav.shop",
    items: [
      { label: "Overview", labelKey: "nav.overview", to: "/admin", icon: LayoutDashboard },
      { label: "Customers", labelKey: "nav.customers", to: "/admin/customers", icon: Users },
      { label: "Suppliers", labelKey: "nav.suppliers", to: "/admin/suppliers", icon: Truck },
      { label: "Inventory", labelKey: "nav.inventory", to: "/admin/inventory", icon: Boxes },
      { label: "Products", labelKey: "nav.products", to: "/admin/products", icon: Package },
      { label: "Orders & Sales", labelKey: "nav.sales", to: "/admin/sales", icon: ReceiptText },
      { label: "Payments", labelKey: "nav.payments", to: "/admin/payments", icon: Wallet },
    ],
  },
  {
    title: "Insights",
    titleKey: "nav.insights",
    items: [
      { label: "Reports", labelKey: "nav.reports", to: "/admin/reports", icon: FileBarChart },
      { label: "Analytics", labelKey: "nav.analytics", to: "/admin/analytics", icon: LineChart },
      {
        label: "Advertisements",
        labelKey: "nav.advertisements",
        to: "/admin/advertisements",
        icon: Megaphone,
      },
      { label: "Homepage CMS", labelKey: "nav.cms", to: "/admin/cms", icon: LayoutTemplate },
    ],
  },
  {
    title: "System",
    titleKey: "nav.system",
    items: [
      { label: "Reminders", labelKey: "nav.reminders", to: "/admin/reminders", icon: BellRing },
      { label: "Backups", labelKey: "nav.backups", to: "/admin/backups", icon: DatabaseBackup },
      { label: "Search", labelKey: "nav.search", to: "/admin/search", icon: Search },
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
