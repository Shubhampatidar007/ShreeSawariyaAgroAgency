import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
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
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <Card className="shadow-soft transition-shadow hover:shadow-lg">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                {initials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Link
                to="/admin/customers/$customerId"
                params={{ customerId: customer.id }}
                className="font-display text-sm font-semibold hover:text-primary"
              >
                {customer.name}
              </Link>
              <p className="text-xs text-muted-foreground">{customer.mobile}</p>
            </div>
          </div>
          <StatusBadge status={customer.status} />
        </div>
        <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
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
      </CardContent>
    </Card>
  );
}

export function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <Card className="shadow-soft transition-shadow hover:shadow-lg">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              to="/admin/suppliers/$supplierId"
              params={{ supplierId: supplier.id }}
              className="font-display text-sm font-semibold hover:text-primary"
            >
              {supplier.company}
            </Link>
            <p className="text-xs text-muted-foreground">
              {supplier.name} · {supplier.mobile}
            </p>
          </div>
          <StatusBadge status={supplier.status} />
        </div>
        <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
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
      </CardContent>
    </Card>
  );
}

export function InventoryCard({ item }: { item: InventoryItem }) {
  const navigate = useNavigate();

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-sm font-semibold">{item.productName}</p>
            <p className="text-xs text-muted-foreground">{item.supplierName}</p>
          </div>
          <div className="rounded-full border bg-background px-2.5 py-1 text-xs font-semibold">
            Stock {item.quantity} {item.unit}
          </div>
        </div>
        <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
          <Row label="Quantity" value={`${item.quantity} ${item.unit}`} />
          <Row label="Purchase price" value={formatCurrency(item.purchasePrice)} />
          <Row label="Updated" value={formatDate(item.lastUpdated)} />
          <Row label="Minimum stock" value={`${item.minStockLevel} ${item.unit}`} />
        </div>
        <Button
          className="w-full rounded-full"
          variant="outline"
          onClick={() => void configureReminder()}
        >
          <Bell className="size-4" />
          Configure reminder
        </Button>
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
