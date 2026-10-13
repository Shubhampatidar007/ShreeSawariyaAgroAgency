import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  BellRing,
  Package,
  PackageCheck,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function readDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set<string>(
      Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [],
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
  const inventory = useShopStore((state) => state.inventory);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => readDismissedIds());

  useEffect(() => {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage errors.
    }
    setDismissedIds(new Set<string>());
  }, []);

  const lowStockItems = useMemo(
    () => inventory.filter((item) => item.quantity <= item.minStockLevel).map((item) => ({ item })),
    [inventory],
  );

  const visibleItems = useMemo(
    () => lowStockItems.filter(({ item }) => !dismissedIds.has(item.id)),
    [lowStockItems, dismissedIds],
  );

  const current = visibleItems[0];
  const open = Boolean(current);
  const currentIndex = visibleItems.findIndex(({ item }) => item.id === current?.item.id);
  const remainingCount = Math.max(0, visibleItems.length - currentIndex - 1);

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
        <div className="border-b border-destructive/10 bg-destructive/5 px-4 py-4 sm:px-8 sm:py-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </div>

            <DialogHeader className="flex-1 space-y-1 text-left">
              <DialogTitle className="text-xl sm:text-2xl">Low stock warning</DialogTitle>
              <DialogDescription>
                This product has reached its configured minimum stock level and needs attention.
              </DialogDescription>
            </DialogHeader>

            {visibleItems.length > 1 && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive">
                {currentIndex + 1} of {visibleItems.length}
              </span>
            )}
          </div>
        </div>

        {current && (
          <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-8 sm:py-6">
            {/* Product banner — flat, no nested card. */}
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PackageCheck className="size-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base sm:text-lg font-semibold tracking-tight">
                  {current.item.productName}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Inventory item needs restocking.
                </p>
              </div>
            </div>

            {/* The two quantity cards — styled like the dashboard's StatCard
                (Today's Sales card) so the visual language matches the home page. */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Current quantity — mirrors the "Today's Sales" emerald card. */}
              <Card className="group relative overflow-hidden border-border/80 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-100 bg-gradient-to-r from-primary to-brand-lime transition-transform duration-300" />
                <CardContent className="p-3 sm:p-4 lg:p-5">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground sm:text-xs sm:tracking-[0.12em]">
                        Current quantity
                      </p>
                      <p className="mt-1.5 font-display text-base font-semibold tracking-tight sm:mt-2 sm:text-lg lg:text-2xl">
                        {current.item.quantity} {current.item.unit}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">
                        Available now
                      </p>
                    </div>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 transition-transform duration-300 group-hover:scale-105 sm:size-10">
                      <Package className="size-4 sm:size-5" />
                    </span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive sm:mt-4 sm:px-2.5 sm:py-1 sm:text-xs">
                    <ArrowDownRight className="size-3 sm:size-3.5" />
                    Below minimum
                  </div>
                </CardContent>
              </Card>

              {/* Minimum stock level — mirrors the "Stock" blue card. */}
              <Card className="group relative overflow-hidden border-border/80 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-100 bg-gradient-to-r from-blue-500 to-blue-400 transition-transform duration-300" />
                <CardContent className="p-3 sm:p-4 lg:p-5">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground sm:text-xs sm:tracking-[0.12em]">
                        Minimum stock level
                      </p>
                      <p className="mt-1.5 font-display text-base font-semibold tracking-tight sm:mt-2 sm:text-lg lg:text-2xl">
                        {current.item.minStockLevel} {current.item.unit}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">
                        Restock threshold
                      </p>
                    </div>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200 transition-transform duration-300 group-hover:scale-105 sm:size-10">
                      <Target className="size-4 sm:size-5" />
                    </span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 sm:mt-4 sm:px-2.5 sm:py-1 sm:text-xs">
                    <Target className="size-3 sm:size-3.5" />
                    Target level
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alert message — single, flat, easy to scan. */}
            <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 sm:p-4 text-sm text-destructive">
              <BellRing className="mt-0.5 size-4 shrink-0" />
              <p>
                Stock is at or below the configured minimum. Review this product in Inventory and
                restock it when required.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:space-x-2">
              <Button variant="outline" onClick={closeAll} disabled={visibleItems.length <= 1}>
                Close all
              </Button>
              <Button onClick={() => dismiss(current.item.id)}>Close</Button>
            </DialogFooter>

            {remainingCount > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                {remainingCount} more low-stock {remainingCount === 1 ? "item" : "items"} will be
                shown next.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
