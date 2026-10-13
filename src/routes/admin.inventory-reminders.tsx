import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, BellOff, CheckCircle2, Package, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { loadShopData, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/inventory-reminders")({
  head: () => ({
    meta: [
      { title: "Inventory Reminders — Admin" },
      {
        name: "description",
        content: "Manage configured low-stock reminders for inventory products.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InventoryRemindersPage,
});

function InventoryRemindersPage() {
  const inventory = useShopStore((state) => state.inventory);
  const reminders = useShopStore((state) => state.reminders);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inventoryReminders = useMemo(() => {
    const inventoryById = new Map(inventory.map((item) => [item.id, item]));

    return reminders
      .filter((reminder) => reminder.target === "inventory" && reminder.sourceId)
      .map((reminder) => {
        const item = reminder.sourceId ? inventoryById.get(reminder.sourceId) : undefined;

        return item ? { reminder, item } : null;
      })
      .filter(
        (
          entry,
        ): entry is {
          reminder: (typeof reminders)[number];
          item: (typeof inventory)[number];
        } => entry !== null,
      );
  }, [inventory, reminders]);

  const toggleReminder = async (reminderId: string, active: boolean) => {
    setBusyId(reminderId);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("reminders")
        .update({ status: active ? "paused" : "active" })
        .eq("id", reminderId);

      if (updateError) throw updateError;

      await loadShopData();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : "Failed to update inventory reminder.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteReminder = async (reminderId: string) => {
    if (!window.confirm("Delete this inventory reminder?")) return;

    setBusyId(reminderId);
    setError(null);

    try {
      const { error: deleteError } = await supabase.from("reminders").delete().eq("id", reminderId);

      if (deleteError) throw deleteError;

      await loadShopData();
    } catch (deleteErr) {
      setError(
        deleteErr instanceof Error ? deleteErr.message : "Failed to delete inventory reminder.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <ModulePageHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Reminders", to: "/admin/reminders" },
          { label: "Inventory reminders" },
        ]}
        eyebrow="Inventory control"
        title="Inventory Reminders"
        description="Control the low-stock reminders already configured from Inventory."
        actions={
          <Button variant="outline" size="sm" className="rounded-full" asChild>
            <Link to="/admin/reminders">Customer reminders</Link>
          </Button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive sm:text-sm">
          {error}
        </div>
      ) : null}

      <Card className="shadow-soft">
        <CardHeader className="py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Bell className="size-4" />
              Configured reminders
            </CardTitle>
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs">
              {inventoryReminders.length} configured
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          {inventoryReminders.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <BellOff className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No inventory reminders configured</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Open Inventory and use Configure reminder on a product to add one.
              </p>
            </div>
          ) : (
            /* Multi-column grid so as many reminders as possible fit on one row,
               especially on PWA / mobile widths. */
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {inventoryReminders.map(({ reminder, item }) => {
                const active = reminder.status === "active";
                const busy = busyId === reminder.id;

                return (
                  <div key={reminder.id} className="flex flex-col rounded-xl border p-2.5 sm:p-3">
                    {/* Compact product header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Package className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold leading-tight">
                            {item.productName}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={active ? "default" : "secondary"}
                        className="shrink-0 px-2 py-0.5 text-[10px]"
                      >
                        {active ? "Active" : "Paused"}
                      </Badge>
                    </div>

                    {/* Quantity boxes — always 2 columns side-by-side, even on
                       narrow phones, mirroring the Low Stock Warning popup. */}
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-muted/50 px-2 py-1.5">
                        <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                          Current
                        </p>
                        <p className="mt-0.5 text-sm font-bold sm:text-base">
                          {item.quantity} {item.unit}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-2 py-1.5">
                        <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                          Minimum
                        </p>
                        <p className="mt-0.5 text-sm font-bold sm:text-base">
                          {item.minStockLevel} {item.unit}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons — full width, compact, stacked. */}
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      <Button
                        size="sm"
                        variant={active ? "outline" : "default"}
                        className="h-8 text-xs"
                        disabled={busy}
                        onClick={() => void toggleReminder(reminder.id, active)}
                      >
                        {active ? (
                          <>
                            <BellOff className="size-3.5" />
                            Turn off
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3.5" />
                            Turn on
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs"
                        disabled={busy}
                        onClick={() => void deleteReminder(reminder.id)}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
