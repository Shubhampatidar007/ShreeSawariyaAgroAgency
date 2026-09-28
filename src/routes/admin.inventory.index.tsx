import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Boxes, Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/admin/EmptyState";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { InventoryCard } from "@/components/shared/EntityCards";
import { supabase } from "@/integrations/supabase/client";
import {
  formatCurrency,
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
  const [loading, setLoading] = useState(inventory.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [configuringReminderId, setConfiguringReminderId] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadInventoryPage = async () => {
      setLoading(true);
      setLoadError(null);

      const [inventoryResult, remindersResult] = await Promise.all([
        supabase
          .from("inventory_items")
          .select(
            "id,product_name,supplier_id,supplier_name,quantity,unit,purchase_price,selling_price,total_price,min_stock_level,status,last_updated",
          )
          .order("product_name"),
        supabase
          .from("reminders")
          .select(
            "id,title,audience,target,filter_summary,schedule,channel,due_amount,status,next_run,message,source_id",
          )
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      if (cancelled) return;

      const firstError = inventoryResult.error ?? remindersResult.error;
      if (firstError) {
        setLoadError(firstError.message);
        setLoading(false);
        return;
      }

      const mappedInventory = (inventoryResult.data ?? []).map((row: any) => ({
        id: row.id,
        productName: row.product_name ?? "",
        supplierId: row.supplier_id ?? "",
        supplierName: row.supplier_name ?? "",
        quantity: Number(row.quantity ?? 0),
        unit: row.unit ?? "",
        purchasePrice: Number(row.purchase_price ?? 0),
        sellingPrice: row.selling_price == null ? undefined : Number(row.selling_price),
        totalPrice: Number(row.total_price ?? 0),
        minStockLevel: Number(row.min_stock_level ?? 0),
        status: row.status,
        lastUpdated: row.last_updated ?? "",
      }));

      const mappedReminders = (remindersResult.data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        audience: row.audience ?? "",
        target: row.target,
        filterSummary: row.filter_summary ?? "",
        schedule: row.schedule,
        channel: row.channel,
        dueAmount: Number(row.due_amount ?? 0),
        status: row.status,
        nextRun: row.next_run,
        message: row.message ?? "",
        sourceId: row.source_id ?? undefined,
      }));

      // Keep the shared store synchronized for the rest of the admin app.
      const snapshot = useShopStore.getState?.();
      void snapshot;

      // This route owns its page data, so it does not depend on unrelated admin sections.
      if (!cancelled) {
        setLoading(false);
        window.dispatchEvent(
          new CustomEvent("inventory-page-data", {
            detail: { inventory: mappedInventory, reminders: mappedReminders },
          }),
        );
      }
    };

    void loadInventoryPage();

    return () => {
      cancelled = true;
    };
  }, []);

  const localData = useMemo(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      return detail;
    };
    void handler;
    return null;
  }, []);

  const [pageInventory, setPageInventory] = useState<any[]>([]);
  const [pageReminders, setPageReminders] = useState<any[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setPageInventory(detail.inventory ?? []);
      setPageReminders(detail.reminders ?? []);
    };

    window.addEventListener("inventory-page-data", handler);
    return () => window.removeEventListener("inventory-page-data", handler);
  }, []);

  const visibleInventory = pageInventory.length ? pageInventory : inventory;
  const visibleReminders = pageReminders.length ? pageReminders : reminders;

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();

    return visibleInventory.filter(
      (item) =>
        item.quantity > 0 &&
        (!term ||
          item.productName.toLowerCase().includes(term) ||
          item.supplierName.toLowerCase().includes(term)),
    );
  }, [visibleInventory, query]);

  const configureReminder = async (item: (typeof visibleInventory)[number]) => {
    setConfiguringReminderId(item.id);
    setReminderError(null);

    try {
      const existing = visibleReminders.find(
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

      await navigate({ to: "/admin/inventory-reminders" });
    } catch (error) {
      setReminderError(
        error instanceof Error ? error.message : "Failed to configure inventory reminder.",
      );
    } finally {
      setConfiguringReminderId(null);
    }
  };

  if (loading && rows.length === 0) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center rounded-2xl border border-border/70 bg-card/50">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
            <span className="size-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold">Loading inventory</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Fetching inventory records from the shop database.
          </p>
        </div>
      </div>
    );
  }

  if (loadError && rows.length === 0) {
    return (
      <div className="space-y-4">
        <ModulePageHeader
          crumbs={[{ label: "Admin", to: "/admin" }, { label: "Inventory" }]}
          eyebrow="Module"
          title="Inventory"
          description="Stock received from suppliers. Publishing to the storefront is a separate step."
          actions={
            <Button className="rounded-full" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {loadError}
        </div>
      </div>
    );
  }

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

      <SearchToolbar
        value={query}
        onChange={setQuery}
        placeholder="Search product or supplier…"
        autoFocus
        enableSlashShortcut
      />

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
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Purchase price</TableHead>
                  <TableHead className="text-right">Selling price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((item) => {
                  const configured = visibleReminders.some(
                    (reminder) => reminder.target === "inventory" && reminder.sourceId === item.id,
                  );
                  const configuring = configuringReminderId === item.id;

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="min-w-[170px]">
                        <p className="font-semibold leading-5">{item.productName}</p>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary">
                          {item.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex min-w-12 items-center justify-center rounded-lg bg-muted px-2.5 py-1.5 font-bold tabular-nums">
                          {item.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        {item.supplierId ? (
                          <Link
                            to="/admin/suppliers/$supplierId"
                            params={{ supplierId: item.supplierId }}
                            className="font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {item.supplierName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{item.supplierName}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.purchasePrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.sellingPrice === undefined ? "-" : formatCurrency(item.sellingPrice)}
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
                            {configuring ? "Saving…" : "Configure reminder"}
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
