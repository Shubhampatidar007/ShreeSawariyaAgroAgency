import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Boxes, Pencil, Plus, Trash2, Upload } from "lucide-react";

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
import { InventoryCard } from "@/components/shared/EntityCards";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  formatCurrency,
  formatDate,
  loadShopData,
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
  const reminders = useShopStore((s) => s.reminders);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProductName, setEditProductName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editPurchasePrice, setEditPurchasePrice] = useState("");
  const [editMinStock, setEditMinStock] = useState("");
  const [configuringReminderId, setConfiguringReminderId] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

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
    if (!editingId || !editProductName.trim()) return;

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

      await loadShopData();
      await navigate({ to: "/admin/inventory-reminders" });
    } catch (error) {
      setReminderError(
        error instanceof Error ? error.message : "Failed to configure inventory reminder.",
      );
    } finally {
      setConfiguringReminderId(null);
    }
  };

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
              <Plus className="size-4" />
              Add stock entry
            </Link>
          </Button>
        }
      />

      <SearchToolbar value={query} onChange={setQuery} placeholder="Search product or supplier…" />

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
                  <TableHead>Current stock</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((item) => {
                  const configured = reminders.some(
                    (reminder) => reminder.target === "inventory" && reminder.sourceId === item.id,
                  );
                  const configuring = configuringReminderId === item.id;

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{item.supplierName}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.purchasePrice)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(item.lastUpdated)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant={configured ? "outline" : "ghost"}
                            size="sm"
                            disabled={configuring}
                            onClick={() => void configureReminder(item)}
                            title={
                              configured
                                ? "Open inventory reminder configuration"
                                : "Configure low-stock reminder"
                            }
                          >
                            <Bell className="size-4" />
                            {configuring
                              ? "Saving…"
                              : configured
                                ? "Configure reminder"
                                : "Configure reminder"}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${item.productName}`}
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="size-4" />
                          </Button>

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
                            onConfirm={() => shopStore.deleteInventoryItem(item.id)}
                          />

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
                onChange={(e) => setEditProductName(e.target.value)}
                placeholder="Product name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  placeholder="bags"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Purchase price per unit</Label>
              <Input
                value={editPurchasePrice}
                onChange={(e) => setEditPurchasePrice(e.target.value)}
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <Label>Minimum stock level</Label>
              <Input
                value={editMinStock}
                onChange={(e) => setEditMinStock(e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
