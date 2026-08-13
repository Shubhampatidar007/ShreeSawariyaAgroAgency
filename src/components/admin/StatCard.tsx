import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { StatItem } from "@/types";

export function StatCard({ stat, loading = false }: { stat: StatItem; loading?: boolean }) {
  const TrendIcon =
    stat.trend === "up" ? ArrowUpRight : stat.trend === "down" ? ArrowDownRight : ArrowRight;

  return (
    <Card className="group relative overflow-hidden border-border/80 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-primary to-brand-lime transition-transform duration-300 group-hover:scale-x-100" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {stat.label}
            </p>
            {loading ? (
              <>
                <Skeleton className="mt-2 h-8 w-28" />
                <Skeleton className="mt-2 h-3 w-24" />
              </>
            ) : (
              <>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p>
              </>
            )}
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10 transition-transform duration-300 group-hover:scale-105">
            <stat.icon className="size-5" />
          </span>
        </div>
        {loading ? (
          <Skeleton className="mt-4 h-6 w-28 rounded-full" />
        ) : (
          <div
            className={cn(
              "mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              stat.trend === "down"
                ? "bg-warning/15 text-warning"
                : "bg-success/15 text-success",
            )}
          >
            <TrendIcon className="size-3.5" />
            {stat.change}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
