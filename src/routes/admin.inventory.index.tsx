import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, Pencil, Plus, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

import {
  formatCurrency,
  formatDate,
  shopStore,
  useShopStore,
} from "@/lib/shop-store";

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

function InventoryListPage() {
  const inventory = useShopStore((s) => s.inventory);

  const [query, setQuery] = useState("");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProductName, setEditProductName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editPurchasePrice, setEditPurchasePrice] = useState("");
  const [editMinStock, setEditMinStock] = useState("");

 const rows = useMemo(() => {
  const term = query.trim().toLowerCase();

  return inventory.filter(
    (item) =>
      item.quantity > 0 &&
      (!term ||
        item.productName.toLowerCase().includes(term) ||
        item.supplierName.toLowerCase().includes(term)),
  );
}, [inventory, query]);
  const openEdit = (item: (typeof inventory)[number]) => {
    setEditingId(item.id);
    setEditProductName(item.productName);
    setEditQuantity(String(item.quantity));
    setEditUnit(item.unit);
    setEditPurchasePrice(String(item.purchasePrice));
    setEditMinStock(String(item.minStockLevel));
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingId || !editProductName.trim()) {
      return;
    }

    try {
      await shopStore.updateInventoryItem(editingId, {
        productName: editProductName.trim(),
        quantity: Number(editQuantity) || 0,
        unit: editUnit.trim() || "units",
        purchasePrice: Number(editPurchasePrice) || 0,
        minStockLevel: Number(editMinStock) || 0,
      });

      setEditOpen(false);
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update inventory item:", error);
    }
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Inventory" },
        ]}
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

      <SearchToolbar
        value={query}
        onChange={setQuery}
        placeholder="Search product or supplier…"
      />

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
          {/* Mobile cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {rows.map((item) => (
              <InventoryCard key={item.id} item={item} />
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden overflow-hidden shadow-soft lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">
                    Quantity
                  </TableHead>
                  <TableHead className="text-right">
                    Purchase price
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {item.productName}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {item.supplierName}
                    </TableCell>

                    <TableCell className="text-right">
                      {item.quantity} {item.unit}
                    </TableCell>

                    <TableCell className="text-right">
                      {formatCurrency(item.purchasePrice)}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {formatDate(item.lastUpdated)}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${item.productName}`}
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="size-4" />
                        </Button>

                        {/* Delete */}
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${item.productName}`}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          }
                          title={`Delete ${item.productName}?`}
                          description="This will permanently remove this inventory entry. This action cannot be undone."
                          confirmLabel="Delete"
                          onConfirm={() =>
                            shopStore.deleteInventoryItem(item.id)
                          }
                        />

                        {/* Publish */}
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link to="/admin/products/publish">
                            <Upload className="size-4" />
                            Publish
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Edit inventory dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit inventory item</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Product name</Label>

              <Input
                value={editProductName}
                onChange={(e) =>
                  setEditProductName(e.target.value)
                }
                placeholder="Product name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>

                <Input
                  value={editQuantity}
                  onChange={(e) =>
                    setEditQuantity(e.target.value)
                  }
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-2">
                <Label>Unit</Label>

                <Input
                  value={editUnit}
                  onChange={(e) =>
                    setEditUnit(e.target.value)
                  }
                  placeholder="bags"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Purchase price per unit</Label>

              <Input
                value={editPurchasePrice}
                onChange={(e) =>
                  setEditPurchasePrice(e.target.value)
                }
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <Label>Minimum stock level</Label>

              <Input
                value={editMinStock}
                onChange={(e) =>
                  setEditMinStock(e.target.value)
                }
                inputMode="numeric"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>

            <Button onClick={saveEdit}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}