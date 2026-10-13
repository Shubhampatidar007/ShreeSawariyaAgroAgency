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
        className="max-w-md overflow-hidden border-destructive/20 p-0 shadow-2xl sm:rounded-2xl"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        {/* Compact header */}
        <div className="border-b border-destructive/10 bg-destructive/5 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="size-4" />
            </div>

            <DialogHeader className="flex-1 space-y-0.5 text-left">
              <DialogTitle className="text-base sm:text-lg">Low stock warning</DialogTitle>
              <DialogDescription className="text-xs leading-snug">
                This product is at or below its minimum stock level.
              </DialogDescription>
            </DialogHeader>

            {visibleItems.length > 1 && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                {currentIndex + 1}/{visibleItems.length}
              </span>
            )}
          </div>
        </div>

        {current && (
          <div className="space-y-3 px-4 py-3 sm:space-y-3.5 sm:px-5 sm:py-4">
            {/* Compact product banner */}
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PackageCheck className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm sm:text-base font-semibold tracking-tight">
                  {current.item.productName}
                </p>
                <p className="text-[11px] text-muted-foreground">Needs restocking</p>
              </div>
            </div>

            {/* The two quantity cards in a single row, always.
                Styled like the dashboard's StatCard but compact. */}
            <div className="grid grid-cols-2 gap-2">
              {/* Current quantity — emerald accent (matches "Today's Sales"). */}
              <Card className="relative overflow-hidden border-border/80 shadow-soft">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary to-brand-lime" />
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:text-[10px]">
                        Current
                      </p>
                      <p className="mt-1 font-display text-base font-semibold tracking-tight sm:text-lg">
                        {current.item.quantity} {current.item.unit}
                      </p>
                    </div>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 sm:size-8">
                      <Package className="size-3.5 sm:size-4" />
                    </span>
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-0.5 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-semibold text-destructive sm:text-[10px]">
                    <ArrowDownRight className="size-2.5 sm:size-3" />
                    Below min
                  </div>
                </CardContent>
              </Card>

              {/* Minimum stock level — blue accent (matches "Stock" card). */}
              <Card className="relative overflow-hidden border-border/80 shadow-soft">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400" />
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:text-[10px]">
                        Minimum
                      </p>
                      <p className="mt-1 font-display text-base font-semibold tracking-tight sm:text-lg">
                        {current.item.minStockLevel} {current.item.unit}
                      </p>
                    </div>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200 sm:size-8">
                      <Target className="size-3.5 sm:size-4" />
                    </span>
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 sm:text-[10px]">
                    <Target className="size-2.5 sm:size-3" />
                    Target
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compact alert */}
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive">
              <BellRing className="mt-0.5 size-3.5 shrink-0" />
              <p className="leading-snug">
                Review this product in Inventory and restock it when required.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={closeAll}
                disabled={visibleItems.length <= 1}
              >
                Close all
              </Button>
              <Button size="sm" onClick={() => dismiss(current.item.id)}>
                Close
              </Button>
            </DialogFooter>

            {remainingCount > 0 && (
              <p className="text-center text-[11px] text-muted-foreground">
                {remainingCount} more low-stock {remainingCount === 1 ? "item" : "items"} next.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
