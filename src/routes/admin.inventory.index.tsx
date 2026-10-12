import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpDown,
  Bell,
  Boxes,
  CheckCircle2,
  Package,
  Plus,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { InventoryCard } from "@/components/shared/EntityCards";
import { supabase } from "@/integrations/supabase/client";
import {
  formatCurrency,
  loadShopData,
  shopStore,
  useShopStore,
} from "@/lib/shop-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/inventory/")({
  head: () => ({
    meta: [
      { title: "Inventory — Admin" },
      {
        name: "description",
        content: "Stock entries with supplier, quantity and purchase price.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InventoryListPage,
});

// Stock status helpers — derived from quantity vs minStockLevel (no fake data)
type StockFilter = "all" | "low-stock" | "out-of-stock";
type SortKey = "name-asc" | "stock-low" | "stock-high" | "buy-price" | "margin";

function getStockStatus(quantity: number, minStockLevel: number) {
  if (quantity <= 0) return "out-of-stock" as const;
  if (quantity <= minStockLevel) return "low-stock" as const;
  return "in-stock" as const;
}

function InventoryListPage() {
  const inventory = useShopStore((s) => s.inventory);
  const reminders = useShopStore((s) => s.reminders);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [configuringReminderId, setConfiguringReminderId] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name-asc");

  // Derive summary stats from inventory array — no fake data
  const summary = useMemo(() => {
    let totalProducts = inventory.length;
    let totalStockQty = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let stockUnit = "kg";

    for (const item of inventory) {
      totalStockQty += item.quantity;
      stockUnit = item.unit || stockUnit;
      const status = getStockStatus(item.quantity, item.minStockLevel);
      if (status === "out-of-stock") outOfStockCount += 1;
      else if (status === "low-stock") lowStockCount += 1;
    }

    return { totalProducts, totalStockQty, lowStockCount, outOfStockCount, stockUnit };
  }, [inventory]);

  // Unique supplier names for the supplier dropdown filter
  const suppliers = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const item of inventory) {
      if (item.supplierId && !seen.has(item.supplierId)) {
        seen.set(item.supplierId, { id: item.supplierId, name: item.supplierName });
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory]);

  // Filtered + sorted rows (no quantity>0 filter — out-of-stock items show with red badge)
  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = inventory.filter((item) => {
      const matchesTerm =
        !term ||
        item.productName.toLowerCase().includes(term) ||
        item.supplierName.toLowerCase().includes(term);
      const matchesStock =
        stockFilter === "all" ||
        getStockStatus(item.quantity, item.minStockLevel) === stockFilter;
      const matchesSupplier =
        supplierFilter === "all" || item.supplierId === supplierFilter;
      return matchesTerm && matchesStock && matchesSupplier;
    });

    // Sort
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.productName.localeCompare(b.productName);
        case "stock-low":
          return a.quantity - b.quantity;
        case "stock-high":
          return b.quantity - a.quantity;
        case "buy-price":
          return a.purchasePrice - b.purchasePrice;
        case "margin": {
          const marginA = a.sellingPrice && a.purchasePrice > 0
            ? (a.sellingPrice - a.purchasePrice) / a.purchasePrice
            : -1;
          const marginB = b.sellingPrice && b.purchasePrice > 0
            ? (b.sellingPrice - b.purchasePrice) / b.purchasePrice
            : -1;
          return marginB - marginA;
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [inventory, query, stockFilter, supplierFilter, sortBy]);

  const configureReminder = async (item: (typeof inventory)[number]) => {
    setConfiguringReminderId(item.id);
    setReminderError(null);

    try {
      const existing = reminders.find(
        (reminder) => reminder.target === "inventory" && reminder.sourceId === item.id,
      );

      if (existing) {
        if (existing.status !== "active") {
          const { error } = await supabase
            .from("reminders")
            .update({ status: "active" })
            .eq("id", existing.id);

          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("reminders").insert({
          title: `Low stock — ${item.productName}`,
          audience: "admin",
          target: "inventory",
          filter_summary: `Low stock reminder for ${item.productName}`,
          schedule: "on stock threshold",
          channel: "in-app",
          due_amount: 0,
          status: "active",
          next_run: new Date().toISOString(),
          message: `Inventory item ${item.productName} has reached its minimum stock level.`,
          source_id: item.id,
        });

        if (error) throw error;
      }

      toast.success(`Reminder configured for ${item.productName}`);
      await loadShopData();
      await navigate({ to: "/admin/inventory-reminders" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to configure inventory reminder.";
      setReminderError(msg);
      toast.error(msg);
    } finally {
      setConfiguringReminderId(null);
    }
  };

  // Filter tab config with live counts
  const filterTabs: { key: StockFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: summary.totalProducts },
    { key: "low-stock", label: "Low stock", count: summary.lowStockCount },
    { key: "out-of-stock", label: "Out of stock", count: summary.outOfStockCount },
  ];

  // Summary stats row — 4 cards derived from inventory data
  const summaryStats = [
    {
      label: "Total products",
      value: String(summary.totalProducts),
      Icon: Package,
      iconClass: "bg-blue-100 text-blue-700",
    },
    {
      label: "Total stock",
      value: `${summary.totalStockQty.toLocaleString("en-IN")} ${summary.stockUnit}`,
      Icon: Boxes,
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Low stock",
      value: String(summary.lowStockCount),
      Icon: AlertTriangle,
      iconClass: "bg-amber-100 text-amber-700",
    },
    {
      label: "Out of stock",
      value: String(summary.outOfStockCount),
      Icon: XCircle,
      iconClass: "bg-red-100 text-red-700",
    },
  ];

  return (
    <div className="space-y-5">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Inventory" }]}
        eyebrow="Module"
        title="Inventory"
        description="Stock received from suppliers. Publishing to the storefront is a separate step."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/admin/inventory/new">
              <Plus className="size-4" />
              Add stock entry
            </Link>
          </Button>
        }
      />

      {/* Summary stats row — 4 cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
        {summaryStats.map((stat) => (
          <Card key={stat.label} className="shadow-soft">
            <CardContent className="flex items-center gap-3 p-3 sm:p-4">
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full sm:size-10", stat.iconClass)}>
                <stat.Icon className="size-4 sm:size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">{stat.label}</p>
                <p className="font-display text-base font-bold tabular-nums sm:text-lg">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs — All / Low stock / Out of stock */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStockFilter(tab.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              stockFilter === tab.key
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px]",
              stockFilter === tab.key ? "bg-primary-foreground/20" : "bg-muted",
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Supplier dropdown + Sort dropdown */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product or supplier…"
            className="h-10 rounded-full pl-10"
          />
        </div>
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="h-10 w-full rounded-full sm:w-48">
            <SelectValue placeholder="All suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suppliers</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="h-10 w-full rounded-full sm:w-44">
            <ArrowUpDown className="size-4" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="stock-low">Stock (low to high)</SelectItem>
            <SelectItem value="stock-high">Stock (high to low)</SelectItem>
            <SelectItem value="buy-price">Buy price</SelectItem>
            <SelectItem value="margin">Margin (high to low)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reminderError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {reminderError}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No stock entries"
          description="Record your first purchase entry to start tracking godown stock."
          action={
            <Button className="rounded-full" asChild>
              <Link to="/admin/inventory/new">Add stock entry</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile: card grid (1-col for full-width 5-col data grid) */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {rows.map((item) => (
              <InventoryCard key={item.id} item={item} />
            ))}
          </div>

          {/* Desktop: full table */}
          <Card className="hidden overflow-hidden shadow-soft lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Buy price</TableHead>
                  <TableHead className="text-right">Sell price</TableHead>
                  <TableHead className="text-right">Min stock</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((item) => {
                  const configured = reminders.some(
                    (reminder) => reminder.target === "inventory" && reminder.sourceId === item.id,
                  );
                  const configuring = configuringReminderId === item.id;
                  const status = getStockStatus(item.quantity, item.minStockLevel);
                  const margin = item.sellingPrice && item.purchasePrice > 0
                    ? ((item.sellingPrice - item.purchasePrice) / item.purchasePrice) * 100
                    : null;

                  const statusBadge = {
                    "in-stock": { label: "In Stock", className: "bg-emerald-100 text-emerald-700" },
                    "low-stock": { label: "Low Stock", className: "bg-amber-100 text-amber-700" },
                    "out-of-stock": { label: "Out of Stock", className: "bg-red-100 text-red-700" },
                  }[status];

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="min-w-[170px]">
                        <p className="font-semibold leading-5">{item.productName}</p>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        {item.supplierId ? (
                          <Link
                            to="/admin/suppliers/$supplierId"
                            params={{ supplierId: item.supplierId }}
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            {item.supplierName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{item.supplierName}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", statusBadge.className)}>
                          {statusBadge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold tabular-nums">{item.quantity}</span>
                        <span className="text-xs text-muted-foreground"> {item.unit}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.purchasePrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.sellingPrice === undefined ? "—" : formatCurrency(item.sellingPrice)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.minStockLevel} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {margin === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="font-bold text-emerald-600">{margin.toFixed(0)}%</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant={configured ? "outline" : "ghost"}
                            size="sm"
                            disabled={configuring}
                            onClick={() => void configureReminder(item)}
                            title={configured ? "Manage reminder" : "Configure low-stock reminder"}
                          >
                            <Bell className="size-4" />
                            {configuring ? "Saving…" : configured ? "Manage" : "Reminder"}
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to="/admin/products/publish">
                              <Upload className="size-4" />
                              Publish
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
