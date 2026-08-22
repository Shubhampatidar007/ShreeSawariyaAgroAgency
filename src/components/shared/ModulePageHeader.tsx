import type { ReactNode } from "react";
import { BackButton } from "@/components/shared/BackButton";
import { PageCrumbs, type Crumb } from "@/components/shared/PageCrumbs";
import { PageHeader } from "@/components/admin/PageHeader";

type ModulePageHeaderProps = {
  crumbs?: Crumb[];
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  showBack?: boolean;
};

export function ModulePageHeader({
  crumbs,
  eyebrow,
  title,
  description,
  actions,
  showBack = true,
}: ModulePageHeaderProps) {
  return (
    <div className="space-y-3">
      {showBack ? <BackButton /> : null}
      {crumbs ? <PageCrumbs items={crumbs} /> : null}
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
    </div>
  );
}
