import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StatItem } from "@/types";

export function StatCard({ stat }: { stat: StatItem }) {
  const TrendIcon =
    stat.trend === "up" ? ArrowUpRight : stat.trend === "down" ? ArrowDownRight : ArrowRight;

  return (
    <Card className="shadow-soft">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <stat.icon className="size-5" />
          </span>
        </div>
        <div
          className={cn(
            "mt-4 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
            stat.trend === "down"
              ? "bg-warning/15 text-warning"
              : "bg-success/15 text-success",
          )}
        >
          <TrendIcon className="size-3.5" />
          {stat.change}
        </div>
      </CardContent>
    </Card>
  );
}