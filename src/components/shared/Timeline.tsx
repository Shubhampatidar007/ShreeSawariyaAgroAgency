import { cn } from "@/lib/utils";

export type TimelineItem = {
  id: string;
  title: string;
  meta: string;
  description?: string;
  amount?: string;
  tone?: "default" | "success" | "warning" | "danger";
};

const dotTone: Record<string, string> = {
  default: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative space-y-5 border-l border-border pl-6">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            className={cn(
              "absolute -left-[27px] top-1.5 size-3 rounded-full ring-4 ring-background",
              dotTone[item.tone ?? "default"],
            )}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">{item.title}</p>
            {item.amount ? (
              <p className="font-display text-sm font-semibold">{item.amount}</p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{item.meta}</p>
          {item.description ? (
            <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}