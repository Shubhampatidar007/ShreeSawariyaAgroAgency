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
    <div className={cn("grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <Card key={item.label} className="shadow-soft transition-shadow hover:shadow-lg">
          <CardContent className="flex items-start justify-between gap-2 p-3 sm:gap-3 sm:p-4 lg:p-5">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground sm:text-xs sm:tracking-wide">
                {item.label}
              </p>
              <p className="mt-1.5 font-display text-base font-semibold tracking-tight sm:mt-2 sm:text-lg lg:text-2xl">
                {item.value}
              </p>
              {item.helper ? (
                <p className="mt-0.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">{item.helper}</p>
              ) : null}
            </div>
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset sm:size-10",
                toneClasses[item.tone ?? "default"],
              )}
            >
              <item.icon className="size-4 sm:size-5" />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
