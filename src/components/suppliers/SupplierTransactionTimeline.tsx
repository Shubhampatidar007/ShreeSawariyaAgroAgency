import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/shop-store";
import type { SupplierLedgerEntry } from "@/types/business";

type SupplierTransactionTimelineProps = {
  entries: SupplierLedgerEntry[];
};

export function SupplierTransactionTimeline({ entries }: SupplierTransactionTimelineProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const dateGroups = new Map<string, SupplierLedgerEntry[]>();
  entries.forEach((entry) => {
    const group = dateGroups.get(entry.date) ?? [];
    group.push(entry);
    dateGroups.set(entry.date, group);
  });

  const groups = Array.from(dateGroups, ([date, group]) => ({ date, entries: group }));

  const toggleDate = (date: string) => {
    setExpandedDates((current) => {
      const next = new Set(current);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">Transaction timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No supplier transactions recorded yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-6">
            {groups.map(({ date, entries: dayEntries }) => {
              const isOpen = expandedDates.has(date);
              const dayAmount = dayEntries.reduce((sum, entry) => sum + entry.amount, 0);

              return (
                <li key={date} className="relative">
                  <span className="absolute -left-[27px] top-2 size-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="rounded-xl border border-border bg-background/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{formatDate(date)}</p>
                        <p className="text-xs text-muted-foreground">
                          {dayEntries.length} transaction{dayEntries.length === 1 ? "" : "s"} · {formatCurrency(dayAmount)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => toggleDate(date)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        View details
                      </Button>
                    </div>

                    {isOpen ? (
                      <div className="mt-3 space-y-3 border-t border-border pt-3">
                        {dayEntries.map((entry) => {
                          const type = entry.type.toLowerCase();
                          const title =
                            type === "purchase"
                              ? `Purchase${entry.productName ? ` · ${entry.productName}` : ""}`
                              : type === "payment"
                                ? "Payment"
                                : "Advance";
                          const detail = [
                            entry.quantity != null && entry.quantity > 0
                              ? `Quantity: ${entry.quantity} ${entry.unit ?? "unit"}`
                              : null,
                            entry.unitPrice != null && entry.unitPrice > 0
                              ? `Rate: ${formatCurrency(entry.unitPrice)} / ${entry.unit ?? "unit"}`
                              : null,
                            entry.method ? entry.method.toUpperCase() : null,
                            entry.reference?.trim() ? `Reference: ${entry.reference.trim()}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ");

                          return (
                            <div key={entry.id} className="rounded-lg bg-muted/40 p-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">{title}</p>
                                  {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Running balance {formatCurrency(entry.balance)}
                                  </p>
                                  {entry.remarks ? (
                                    <p className="mt-1 text-xs text-muted-foreground">{entry.remarks}</p>
                                  ) : null}
                                </div>
                                <p className="shrink-0 font-display text-sm font-semibold">
                                  {formatCurrency(entry.amount)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
