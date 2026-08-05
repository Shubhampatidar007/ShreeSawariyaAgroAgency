import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SummaryItem = {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
};

const toneClasses: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
};

export function SummaryCards({ items, className }: { items: SummaryItem[]; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <Card key={item.label} className="shadow-soft transition-shadow hover:shadow-lg">
          <CardContent className="flex items-start justify-between gap-3 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{item.value}</p>
              {item.helper ? (
                <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
              ) : null}
            </div>
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                toneClasses[item.tone ?? "default"],
              )}
            >
              <item.icon className="size-5" />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}