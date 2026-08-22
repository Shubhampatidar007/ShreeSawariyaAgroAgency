import type { ReactNode } from "react";
import { BackButton } from "@/components/shared/BackButton";
import { PageCrumbs, type Crumb } from "@/components/shared/PageCrumbs";

type DetailHeaderProps = {
  crumbs: Crumb[];
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  avatar?: ReactNode;
};

export function DetailHeader({
  crumbs,
  title,
  subtitle,
  badge,
  actions,
  avatar,
}: DetailHeaderProps) {
  return (
    <div className="space-y-3">
      <BackButton />
      <PageCrumbs items={crumbs} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {avatar}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
