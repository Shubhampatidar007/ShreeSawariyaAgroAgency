import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";

type PlaceholderPageProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
  plannedFeatures: string[];
};

export function PlaceholderPage({
  icon,
  title,
  description,
  phase,
  plannedFeatures,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module"
        title={title}
        description={description}
        actions={<Badge variant="secondary">Arriving in {phase}</Badge>}
      />

      <EmptyState
        icon={icon}
        title={`${title} is not set up yet`}
        description={`This module has its structure and navigation ready. The working screens land in ${phase}.`}
      />

      <Card className="shadow-soft">
        <CardContent className="p-6">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Planned for this module
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {plannedFeatures.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}