import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { InventoryCard } from "@/components/shared/EntityCards";
import { formatCurrency, formatDate, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/inventory/")({
  head: () => ({
    meta: [
      { title: "Inventory — AgriKisan Admin" },
      { name: "description", content: "Stock entries with supplier, quantity and purchase price." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InventoryListPage,
});

function InventoryListPage() {
  const inventory = useShopStore((s) => s.inventory);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return inventory.filter(
      (item) =>
        !term ||
        item.productName.toLowerCase().includes(term) ||
        item.supplierName.toLowerCase().includes(term),
    );
  }, [inventory, query]);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Inventory" }]}
        eyebrow="Module"
        title="Inventory"
        description="Stock received from suppliers. Publishing to the storefront is a separate step."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/admin/inventory/new">
              <Plus className="size-4" /> Add stock entry
            </Link>
          </Button>
        }
      />

      <SearchToolbar value={query} onChange={setQuery} placeholder="Search product or supplier…" />

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
          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {rows.map((item) => (
              <InventoryCard key={item.id} item={item} />
            ))}
          </div>
          <Card className="hidden overflow-hidden shadow-soft lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Purchase price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-muted-foreground">{item.supplierName}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.purchasePrice)}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(item.lastUpdated)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/admin/products/publish">
                          <Upload className="size-4" /> Publish
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}