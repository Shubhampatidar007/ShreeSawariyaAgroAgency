import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  Eye,
  Pencil,
  Upload,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, loadShopData } from "@/lib/shop-store";
import { supabase } from "@/integrations/supabase/client";
import type { Customer, InventoryItem, PublishedProduct, Supplier } from "@/types/business";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <Card className="shadow-soft transition-shadow hover:shadow-lg">
      <CardContent className="space-y-2 p-3 sm:space-y-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Avatar className="size-8 sm:size-10">
              <AvatarFallback className="bg-primary/10 text-[10px] text-primary sm:text-xs">
                {initials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <Link
                to="/admin/customers/$customerId"
                params={{ customerId: customer.id }}
                className="font-display text-xs font-semibold hover:text-primary sm:text-sm"
              >
                {customer.name}
              </Link>
              <p className="text-[10px] text-muted-foreground sm:text-xs">{customer.mobile}</p>
            </div>
          </div>
          <StatusBadge status={customer.status} />
        </div>
        <div className="space-y-1.5 rounded-lg bg-muted/50 p-2 sm:p-3">
          <Row label="Village" value={customer.village} />
          <Row label="Total purchases" value={formatCurrency(customer.totalPurchases)} />
          <Row
            label="Current due"
            value={
              <span className={customer.currentDue > 0 ? "text-destructive" : "text-success"}>
                {formatCurrency(customer.currentDue)}
              </span>
            }
          />
          <Row label="Last purchase" value={formatDate(customer.lastPurchase)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 rounded-full text-xs" asChild>
            <Link to="/admin/customers/$customerId" params={{ customerId: customer.id }}>
              <Eye className="size-3 sm:size-3.5" />
              View
            </Link>
          </Button>
          <Button size="sm" className="flex-1 rounded-full text-xs" asChild>
            <Link to="/admin/khata/customers/$customerId" params={{ customerId: customer.id }}>
              <BookOpen className="size-3 sm:size-3.5" />
              Khata
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <Card className="shadow-soft transition-shadow hover:shadow-lg">
      <CardContent className="space-y-2 p-3 sm:space-y-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <Link
              to="/admin/suppliers/$supplierId"
              params={{ supplierId: supplier.id }}
              className="font-display text-xs font-semibold hover:text-primary sm:text-sm"
            >
              {supplier.company}
            </Link>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              {supplier.name} · {supplier.mobile}
            </p>
          </div>
          <StatusBadge status={supplier.status} />
        </div>
        <div className="space-y-1.5 rounded-lg bg-muted/50 p-2 sm:p-3">
          <Row label="Supplies" value={supplier.productsSupplied.slice(0, 2).join(", ")} />
          <Row label="Purchases" value={formatCurrency(supplier.totalPurchases)} />
          <Row
            label="Due balance"
            value={
              <span className={supplier.dueBalance > 0 ? "text-destructive" : "text-success"}>
                {formatCurrency(supplier.dueBalance)}
              </span>
            }
          />
          <Row label="Last order" value={formatDate(supplier.lastOrder)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 rounded-full text-xs" asChild>
            <Link to="/admin/suppliers/$supplierId" params={{ supplierId: supplier.id }}>
              <Eye className="size-3 sm:size-3.5" />
              View
            </Link>
          </Button>
          <Button size="sm" className="flex-1 rounded-full text-xs" asChild>
            <Link to="/admin/suppliers/$supplierId/edit" params={{ supplierId: supplier.id }}>
              <Pencil className="size-3 sm:size-3.5" /> Edit
            </Link>
          </Button>
          <Button size="sm" className="flex-1 rounded-full text-xs" asChild>
            <Link to="/admin/ledger/suppliers/$supplierId" params={{ supplierId: supplier.id }}>
              <BookOpen className="size-3 sm:size-3.5" /> Ledger
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Stock status helpers — derived from quantity vs minStockLevel (no fake data)
type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

function getStockStatus(quantity: number, minStockLevel: number): StockStatus {
  if (quantity <= 0) return "out-of-stock";
  if (quantity <= minStockLevel) return "low-stock";
  return "in-stock";
}

const stockStatusConfig: Record<StockStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  "in-stock": {
    label: "In Stock",
    className: "bg-emerald-100 text-emerald-700",
    Icon: CheckCircle2,
  },
  "low-stock": {
    label: "Low Stock",
    className: "bg-amber-100 text-amber-700",
    Icon: AlertTriangle,
  },
  "out-of-stock": {
    label: "Out of Stock",
    className: "bg-red-100 text-red-700",
    Icon: XCircle,
  },
};

// Margin % — calculated from sellingPrice vs purchasePrice (no fake data)
function getMargin(item: InventoryItem): number | null {
  if (!item.sellingPrice || item.purchasePrice <= 0) return null;
  return ((item.sellingPrice - item.purchasePrice) / item.purchasePrice) * 100;
}

export function InventoryCard({ item }: { item: InventoryItem }) {
  const navigate = useNavigate();
  const status = getStockStatus(item.quantity, item.minStockLevel);
  const statusCfg = stockStatusConfig[status];
  const margin = getMargin(item);

  const configureReminder = async () => {
    const { data: existing, error: lookupError } = await supabase
      .from("reminders")
      .select("id, status")
      .eq("target", "inventory")
      .eq("source_id", item.id)
      .maybeSingle();

    if (lookupError) {
      console.error("Failed to find inventory reminder:", lookupError);
      return;
    }

    const result = existing
      ? await supabase.from("reminders").update({ status: "active" }).eq("id", existing.id)
      : await supabase.from("reminders").insert({
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

    if (result.error) {
      console.error("Failed to configure inventory reminder:", result.error);
      return;
    }

    await loadShopData();
    await navigate({ to: "/admin/inventory-reminders" });
  };

  return (
    <Card className="shadow-soft transition-shadow hover:shadow-lg">
      <CardContent className="space-y-3 p-4">
        {/* Row 1: Product identity + status badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-bold leading-5">{item.productName}</p>
            {item.supplierId ? (
              <Link
                to="/admin/suppliers/$supplierId"
                params={{ supplierId: item.supplierId }}
                className="mt-1 inline-flex text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                {item.supplierName}
              </Link>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">{item.supplierName}</p>
            )}
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg.className}`}
          >
            <statusCfg.Icon className="size-3" />
            {statusCfg.label}
          </span>
        </div>

        {/* Row 2: 5-column data grid — Stock / Buy / Sell / Min / Margin */}
        <div className="grid grid-cols-5 gap-2 border-t border-border pt-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Stock</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{item.quantity} <span className="text-[10px] font-normal text-muted-foreground">{item.unit}</span></p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Buy</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{formatCurrency(item.purchasePrice)}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sell</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{item.sellingPrice === undefined ? "—" : formatCurrency(item.sellingPrice)}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Min</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{item.minStockLevel} <span className="text-[10px] font-normal text-muted-foreground">{item.unit}</span></p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Margin</p>
            {margin === null ? (
              <p className="mt-0.5 text-sm text-muted-foreground">—</p>
            ) : (
              <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-600">
                {margin.toFixed(0)}%
              </p>
            )}
          </div>
        </div>

        {/* Row 3: Actions — Configure reminder + Publish */}
        <div className="flex gap-2 border-t border-border pt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-full text-xs"
            onClick={() => void configureReminder()}
          >
            <Bell className="size-3.5" />
            Reminder
          </Button>
          <Button variant="outline" size="sm" className="flex-1 rounded-full text-xs" asChild>
            <Link to="/admin/products/publish">
              <Upload className="size-3.5" />
              Publish
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminProductCard({
  product,
  actions,
}: {
  product: PublishedProduct;
  actions?: ReactNode;
}) {
  const image = product.images[0];

  return (
    <Card className="overflow-hidden shadow-soft transition-shadow hover:shadow-lg">
      <div className="flex h-40 items-center justify-center bg-muted p-2 text-4xl">
        {image ? (
          <img
            src={image}
            alt={product.title}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
          />
        ) : (
          product.emoji
        )}
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-sm font-semibold leading-snug">{product.title}</p>
            <p className="text-xs text-muted-foreground">{product.category}</p>
          </div>
          <StatusBadge status={product.status} />
        </div>
        <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
          <Row
            label="Price"
            value={
              product.discountPrice
                ? `${formatCurrency(product.discountPrice)} (MRP ${formatCurrency(product.sellingPrice)})`
                : formatCurrency(product.sellingPrice)
            }
          />
          <Row label="Stock" value={product.stock} />
          <Row label="Visibility" value={product.visibility} />
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}
