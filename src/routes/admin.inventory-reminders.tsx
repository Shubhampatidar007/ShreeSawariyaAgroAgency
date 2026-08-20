import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, BellOff, CheckCircle2, Package, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useShopStore } from "@/lib/shop-store";
import { ensureAdminSectionData } from "@/lib/admin-section-loader";

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

      await ensureAdminSectionData(true);
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

      await ensureAdminSectionData(true);
    } catch (deleteErr) {
      setError(
        deleteErr instanceof Error ? deleteErr.message : "Failed to delete inventory reminder.",
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5" />
                Configured reminders
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure or disable reminders from the Inventory module. The popup uses these
                active records.
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
              <p className="mt-3 font-medium">No inventory reminders configured</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Open Inventory and use Configure reminder on a product to add one.
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
    </div>
  );
}
