import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, BellOff, CheckCircle2, Package, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { ensureAdminSectionData, useShopStore } from "@/lib/admin-section-loader";

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
        const item = reminder.sourceId
          ? inventoryById.get(reminder.sourceId)
          : undefined;

        return item ? { reminder, item } : null;
      })
      .filter(
        (entry): entry is {
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

      await ensureAdminSectionData(true);
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update inventory reminder.",
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
      const { error: deleteError } = await supabase
        .from("reminders")
        .delete()
        .eq("id", reminderId);

      if (deleteError) throw deleteError;

      await ensureAdminSectionData(true);
    } catch (deleteErr) {
      setError(
        deleteErr instanceof Error
          ? deleteErr.message
          : "Failed to delete inventory reminder.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
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
          <Button variant="outline" className="rounded-full" asChild>
            <Link to="/admin/reminders">Customer reminders</Link>
          </Button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            Configured low-stock reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryReminders.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <Package className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No inventory reminders configured</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Configure a reminder from the Inventory module for products that need attention.
              </p>
              <Button className="mt-4 rounded-full" asChild>
                <Link to="/admin/inventory">Open inventory</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {inventoryReminders.map(({ reminder, item }) => {
                const active = reminder.status === "active";
                const busy = busyId === reminder.id;

                return (
                  <div key={reminder.id} className="flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.productName}</p>
                        <Badge variant={active ? "default" : "secondary"} className="rounded-full">
                          {active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Current stock: {item.quantity} {item.unit} · Minimum: {item.minStockLevel} {item.unit}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={busy}
                        onClick={() => void toggleReminder(reminder.id, active)}
                      >
                        {active ? <BellOff className="size-4" /> : <Bell className="size-4" />}
                        {active ? "Pause" : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${item.productName} reminder`}
                        disabled={busy}
                        onClick={() => void deleteReminder(reminder.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
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
