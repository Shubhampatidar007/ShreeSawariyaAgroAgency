import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ChartCardProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  loading?: boolean;
  error?: string | undefined;
  empty?: boolean;
  emptyLabel?: string;
};

export function ChartCard({
  title,
  description,
  actions,
  children,
  className,
  loading,
  error,
  empty,
  emptyLabel = "No data for this period",
}: ChartCardProps) {
  return (
    <Card className={cn("shadow-soft", className)}>
      <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-destructive/40 text-center">
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">Refresh the page to retry.</p>
          </div>
        ) : empty ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
