import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Package,
  Plus,
  Trash2,
} from "lucide-react";

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
        content: "Manually control low-stock reminders for inventory products.",
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
  const [creatingId, setCreatingId] = useState<string | null>(null);
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

  const reminderInventoryIds = useMemo(
    () => new Set(inventoryReminders.map(({ item }) => item.id)),
    [inventoryReminders],
  );

  const availableInventory = inventory.filter(
    (item) => !reminderInventoryIds.has(item.id),
  );

  const createReminder = async (item: (typeof inventory)[number]) => {
    setCreatingId(item.id);
    setError(null);

    try {
      const { error: insertError } = await supabase.from("reminders").insert({
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

      if (insertError) throw insertError;

      await loadShopData();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create inventory reminder.",
      );
    } finally {
      setCreatingId(null);
    }
  };

  const toggleReminder = async (
    reminderId: string,
    active: boolean,
  ) => {
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

      await loadShopData();
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
        description="Manually create, pause, resume and delete low-stock reminders for inventory products."
        actions={
          <Button variant="outline" className="rounded-full" asChild>
            <Link to="/admin/reminders">
              Customer reminders
            </Link>
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5" />
                Configured reminders
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                These reminders are linked directly to inventory products.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full">
              {inventoryReminders.length} configured
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {inventoryReminders.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <BellOff className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No inventory reminders yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a reminder from the inventory list below.
              </p>
            </div>
          ) : (
            inventoryReminders.map(({ reminder, item }) => {
              const active = reminder.status === "active";
              const busy = busyId === reminder.id;

              return (
                <div key={reminder.id} className="rounded-2xl border p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Package className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.productName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {active ? "Reminder is enabled" : "Reminder is paused"}
                        </p>
                      </div>
                    </div>

                    <Badge variant={active ? "default" : "secondary"}>
                      {active ? "Active" : "Paused"}
                    </Badge>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-muted/50 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Current stock
                      </p>
                      <p className="mt-1 text-xl font-bold">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Minimum stock
                      </p>
                      <p className="mt-1 text-xl font-bold">
                        {item.minStockLevel} {item.unit}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant={active ? "outline" : "default"}
                      disabled={busy}
                      onClick={() => void toggleReminder(reminder.id, active)}
                    >
                      {active ? (
                        <>
                          <BellOff className="size-4" />
                          Turn off reminder
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-4" />
                          Turn on reminder
                        </>
                      )}
                    </Button>

                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void deleteReminder(reminder.id)}
                    >
                      <Trash2 className="size-4" />
                      Delete reminder
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-5" />
            Add inventory reminder
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Every inventory item can have one low-stock reminder.
          </p>
        </CardHeader>

        <CardContent className="space-y-2">
          {availableInventory.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              All inventory products already have a reminder.
            </p>
          ) : (
            availableInventory.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} {item.unit} current · minimum {item.minStockLevel} {item.unit}
                  </p>
                </div>

                <Button
                  size="sm"
                  className="rounded-full"
                  disabled={creatingId === item.id}
                  onClick={() => void createReminder(item)}
                >
                  <Plus className="size-4" />
                  {creatingId === item.id ? "Adding…" : "Add reminder"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
