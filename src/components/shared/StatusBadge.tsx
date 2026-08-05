import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  published: "bg-success/15 text-success border-success/30",
  paid: "bg-success/15 text-success border-success/30",
  inactive: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
  hidden: "bg-muted text-muted-foreground border-border",
  "inventory-only": "bg-primary/10 text-primary border-primary/25",
  pending: "bg-warning/15 text-warning border-warning/30",
  "out-of-stock": "bg-warning/15 text-warning border-warning/30",
  due: "bg-warning/15 text-warning border-warning/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
  archived: "bg-destructive/10 text-destructive border-destructive/25",
};

const labels: Record<string, string> = {
  "inventory-only": "Inventory only",
  "out-of-stock": "Out of stock",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        tones[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {labels[status] ?? status}
    </Badge>
  );
}