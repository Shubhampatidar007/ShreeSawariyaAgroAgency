import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { StatItem } from "@/types";

// Per-stat icon color coding. Maps stat.id → Tailwind color classes for the
// icon container background, text, and ring. Matches the image's visual style
// where each card type has a distinct color (sales=emerald, stock=blue,
// due=purple, alerts=amber, supplier=teal, top product=emerald).
// Falls back to primary green for unknown stat IDs (forward-compatible).
const colorByStatId: Record<string, string> = {
  sales: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  stock: "bg-blue-100 text-blue-700 ring-blue-200",
  "customer-due": "bg-purple-100 text-purple-700 ring-purple-200",
  alerts: "bg-amber-100 text-amber-700 ring-amber-200",
  "supplier-paid": "bg-teal-100 text-teal-700 ring-teal-200",
  "top-sale-product": "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

const defaultColor = "bg-primary/10 text-primary ring-primary/10";

export function StatCard({ stat, loading = false }: { stat: StatItem; loading?: boolean }) {
  const TrendIcon =
    stat.trend === "up" ? ArrowUpRight : stat.trend === "down" ? ArrowDownRight : ArrowRight;
  const colorClass = colorByStatId[stat.id] ?? defaultColor;

  return (
    <Card className="group relative overflow-hidden border-border/80 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-primary to-brand-lime transition-transform duration-300 group-hover:scale-x-100" />
      {/* Compact padding on mobile (p-3), slightly larger on sm+ (p-4),
          full size on lg+ (p-5). Optimized for PWA mobile view. */}
      <CardContent className="p-3 sm:p-4 lg:p-5">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground sm:text-xs sm:tracking-[0.12em]">
              {stat.label}
            </p>
            {loading ? (
              <>
                <Skeleton className="mt-1.5 h-6 w-24 sm:mt-2 sm:h-8 sm:w-28" />
                <Skeleton className="mt-1.5 h-3 w-20 sm:mt-2 sm:w-24" />
              </>
            ) : (
              <>
                {/* Smaller value font on mobile (text-base), grows to text-2xl on lg+ */}
                <p className="mt-1.5 font-display text-base font-semibold tracking-tight sm:mt-2 sm:text-lg lg:text-2xl">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">{stat.helper}</p>
              </>
            )}
          </div>
          {/* Icon container: 32px on mobile (size-8), 40px on sm+ (size-10).
              Circular with per-stat color coding. */}
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-transform duration-300 group-hover:scale-105 sm:size-10",
              colorClass,
            )}
          >
            <stat.icon className="size-4 sm:size-5" />
          </span>
        </div>
        {loading ? (
          <Skeleton className="mt-3 h-5 w-24 rounded-full sm:mt-4 sm:h-6 sm:w-28" />
        ) : (
          <div
            className={cn(
              "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:mt-4 sm:px-2.5 sm:py-1 sm:text-xs",
              stat.trend === "down" ? "bg-warning/15 text-warning" : "bg-success/15 text-success",
            )}
          >
            <TrendIcon className="size-3 sm:size-3.5" />
            {stat.change}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
