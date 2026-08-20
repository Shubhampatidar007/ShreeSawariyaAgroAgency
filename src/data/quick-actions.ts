export const quickActions = [
  { title: "New sale bill", description: "Create a counter invoice", to: "/admin/sales" },
  { title: "Add product", description: "List a new item in catalogue", to: "/admin/products" },
  {
    title: "Stock entry",
    description: "Record incoming supplier stock",
    to: "/admin/inventory/new",
  },
  { title: "Run backup", description: "Take a manual data snapshot", to: "/admin/backups" },
] as const;
