import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
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

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useI18n();
  const labels: Record<string, string> = {
    "inventory-only": t("common.statuses.inventoryOnly"),
    "out-of-stock": t("common.statuses.outOfStock"),
    active: t("common.statuses.active"),
    published: t("common.statuses.published"),
    paid: t("common.statuses.paid"),
    inactive: t("common.statuses.inactive"),
    draft: t("common.statuses.draft"),
    hidden: t("common.statuses.hidden"),
    pending: t("common.statuses.pending"),
    due: t("common.statuses.due"),
    blocked: t("common.statuses.blocked"),
    archived: t("common.statuses.archived"),
  };

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
