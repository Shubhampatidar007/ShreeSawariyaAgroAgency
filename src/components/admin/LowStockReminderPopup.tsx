import { useMemo, useState } from "react";
import { AlertTriangle, BellRing, PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { InventoryItem } from "@/types/business";
import { useShopStore } from "@/lib/shop-store";

const SESSION_KEY = "agroshop_low_stock_dismissed";

type LowStockReminder = {
  id: string;
  status: string;
  target: string;
  sourceId?: string;
};

function readDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set<string>(
      Array.isArray(ids)
        ? ids.filter((id): id is string => typeof id === "string")
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

function persistDismissedIds(ids: Set<string>) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore storage errors.
  }
}

export function LowStockReminderPopup() {
  const reminders = useShopStore((state) => state.reminders);
  const inventory = useShopStore((state) => state.inventory);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => readDismissedIds());

  const lowStockItems = useMemo(() => {
    const inventoryById = new Map(inventory.map((item) => [item.id, item]));

    return (reminders as LowStockReminder[])
      .filter(
        (reminder) =>
          reminder.status === "active" &&
          reminder.target === "inventory" &&
          !!reminder.sourceId,
      )
      .map((reminder) => {
        const item = reminder.sourceId
          ? inventoryById.get(reminder.sourceId)
          : undefined;

        if (!item || item.quantity > item.minStockLevel) return null;

        return { reminder, item };
      })
      .filter(
        (value): value is {
          reminder: LowStockReminder;
          item: InventoryItem;
        } => value !== null,
      );
  }, [reminders, inventory]);

  const visibleItems = useMemo(
    () => lowStockItems.filter(({ item }) => !dismissedIds.has(item.id)),
    [lowStockItems, dismissedIds],
  );

  const current = visibleItems[0];
  const open = Boolean(current);

  function dismiss(itemId: string) {
    setDismissedIds((previous) => {
      const next = new Set(previous);
      next.add(itemId);
      persistDismissedIds(next);
      return next;
    });
  }

  function closeAll() {
    setDismissedIds((previous) => {
      const next = new Set(previous);
      visibleItems.forEach(({ item }) => next.add(item.id));
      persistDismissedIds(next);
      return next;
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && current) dismiss(current.item.id);
      }}
    >
      <DialogContent
        className="max-w-2xl overflow-hidden border-destructive/20 p-0 shadow-2xl sm:rounded-2xl"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div className="border-b border-destructive/10 bg-destructive/5 px-6 py-5 sm:px-8">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </div>

            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-xl sm:text-2xl">Low stock warning</DialogTitle>
              <DialogDescription>
                This product has reached its configured minimum stock level and needs attention.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {current && (
          <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <PackageCheck className="size-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold tracking-tight">{current.item.productName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Inventory item needs restocking.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current quantity</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {current.item.quantity} {current.item.unit}
                  </p>
                </div>

                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Minimum stock level</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {current.item.minStockLevel} {current.item.unit}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                <BellRing className="mt-0.5 size-4 shrink-0" />
                <p>
                  Stock is at or below the configured minimum. Review this product in Inventory and restock it when required.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:space-x-2">
              <Button variant="outline" onClick={closeAll} disabled={visibleItems.length <= 1}>
                Close all
              </Button>
              <Button onClick={() => dismiss(current.item.id)}>Close</Button>
            </DialogFooter>

            {visibleItems.length > 1 && (
              <p className="text-center text-xs text-muted-foreground">
                {visibleItems.length - 1} more low-stock {visibleItems.length - 1 === 1 ? "item" : "items"} will be shown next.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
