import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/shop-store";
import type { SupplierLedgerEntry } from "@/types/business";

type SupplierTimelineEntry = SupplierLedgerEntry & {
  productName?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
};

type Props = { entries: SupplierLedgerEntry[] };

const formatTimelineDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export function SupplierTransactionTimeline({ entries }: Props) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const byDate = new Map<string, SupplierLedgerEntry[]>();
    for (const entry of entries) {
      const group = byDate.get(entry.date) ?? [];
      group.push(entry);
      byDate.set(entry.date, group);
    }

    return Array.from(byDate, ([date, dayEntries]) => {
      const purchases = dayEntries.filter((entry) => entry.type.toLowerCase() === "purchase");
      const advances = dayEntries.filter((entry) => entry.type.toLowerCase() === "advance");
      const payments = dayEntries.filter((entry) => entry.type.toLowerCase() === "payment");
      const purchaseTotal = purchases.reduce((sum, entry) => sum + entry.amount, 0);
      const paidTotal =
        advances.reduce((sum, entry) => sum + entry.amount, 0) +
        payments.reduce((sum, entry) => sum + entry.amount, 0);

      return {
        date,
        entries: dayEntries,
        purchases,
        advances,
        payments,
        purchaseTotal,
        paidTotal,
        due: dayEntries[dayEntries.length - 1]?.balance ?? 0,
      };
    });
  }, [entries]);

  const toggleDate = (date: string) => {
    setExpandedDates((current) => {
      const next = new Set(current);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  return (
    <Card className="supplier-timeline-full shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg">Purchase timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No supplier transactions recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const isOpen = expandedDates.has(group.date);
              return (
                <div key={group.date} className="overflow-hidden rounded-xl border bg-background">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/40"
                    onClick={() => toggleDate(group.date)}
                    aria-expanded={isOpen}
                  >
                    <div>
                      <p className="text-base font-semibold">{formatTimelineDate(group.date)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {group.purchases.length} transaction{group.purchases.length === 1 ? "" : "s"} · {formatCurrency(group.purchaseTotal)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      {isOpen ? "Hide details" : "View details"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t p-4">
                      <div className="space-y-2">
                        {group.purchases.map((rawEntry) => {
                          const entry = rawEntry as SupplierTimelineEntry;
                          return (
                            <div
                              key={entry.id}
                              className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_140px_140px_140px] sm:items-center"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                  {entry.productName || entry.reference || "Purchase"}
                                </p>
                                {entry.remarks ? (
                                  <p className="mt-1 text-xs text-muted-foreground">{entry.remarks}</p>
                                ) : null}
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quantity</p>
                                <p className="text-sm font-medium">
                                  {entry.quantity != null ? `${entry.quantity} ${entry.unit ?? ""}` : "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rate</p>
                                <p className="text-sm font-medium">
                                  {entry.unitPrice != null ? formatCurrency(entry.unitPrice) : "—"}
                                </p>
                              </div>
                              <div className="sm:text-right">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Amount</p>
                                <p className="text-sm font-semibold">{formatCurrency(entry.amount)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Purchase total</p>
                          <p className="mt-1 font-semibold">{formatCurrency(group.purchaseTotal)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Advance / paid</p>
                          <p className="mt-1 font-semibold">{formatCurrency(group.paidTotal)}</p>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-xs text-muted-foreground">Due after date</p>
                          <p className="mt-1 font-semibold">{formatCurrency(group.due)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
