import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type Metric = {
  id: string;
  label: string;
  value: string;
  helper?: string;
  change?: string;
  trend?: "up" | "down" | "flat";
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
};

const toneClasses: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
};

const trendIcon = { up: ArrowUpRight, down: ArrowDownRight, flat: ArrowRight };
const trendClass = {
  up: "text-success",
  down: "text-destructive",
  flat: "text-muted-foreground",
};

export function MetricCard({ metric }: { metric: Metric }) {
  const TrendIcon = trendIcon[metric.trend ?? "flat"];

  return (
    <Card className="group shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {metric.label}
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{metric.value}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            {metric.change ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-semibold",
                  trendClass[metric.trend ?? "flat"],
                )}
              >
                <TrendIcon className="size-3.5" />
                {metric.change}
              </span>
            ) : null}
            {metric.helper ? (
              <span className="text-muted-foreground">{metric.helper}</span>
            ) : null}
          </div>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
            toneClasses[metric.tone ?? "default"],
          )}
        >
          <metric.icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

export function MetricCardSkeleton() {
  return (
    <Card className="shadow-soft">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="w-full space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="size-10 rounded-xl" />
      </CardContent>
    </Card>
  );
}

export function MetricGrid({ metrics, columns = 4 }: { metrics: Metric[]; columns?: 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2",
        columns === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3",
      )}
    >
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}
