import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Eye, EyeOff, Image, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { shopStore, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/cms")({
  head: () => ({
    meta: [
      { title: "Homepage CMS — AgriKisan Admin" },
      { name: "description", content: "Manage hero banners, posters, offers and homepage sections." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CmsPage,
});

function CmsPage() {
  const sections = useShopStore((s) => [...s.cmsSections].sort((a, b) => a.order - b.order));

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Homepage CMS" }]}
        eyebrow="Storefront"
        title="Homepage content management"
        description="Reorder, enable and schedule the sections farmers see on the storefront."
        actions={
          <Button variant="outline" className="rounded-full" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              <Eye className="size-4" /> Preview homepage
            </a>
          </Button>
        }
      />

      <div className="space-y-3">
        {sections.map((section, index) => (
          <Card key={section.id} className="shadow-soft transition-shadow hover:shadow-lg">
            <CardContent className="grid gap-4 p-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
              <div className="flex gap-1 lg:flex-col">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => shopStore.moveCmsSection(section.id, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move down"
                  disabled={index === sections.length - 1}
                  onClick={() => shopStore.moveCmsSection(section.id, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>

              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <LayoutTemplate className="size-4 shrink-0 text-primary" />
                  <p className="font-display font-semibold">{section.name}</p>
                  <StatusBadge status={section.type} />
                  <StatusBadge status={section.visibility === "public" ? "published" : "hidden"} />
                </div>
                <p className="text-sm font-medium">{section.headline}</p>
                <p className="text-sm text-muted-foreground">{section.body}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Image className="size-3.5" /> {section.imageLabel}
                  </span>
                  <span>
                    Schedule: {section.scheduledFrom ?? "—"} → {section.scheduledTo ?? "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() =>
                    shopStore.updateCmsSection(section.id, {
                      visibility: section.visibility === "public" ? "hidden" : "public",
                    })
                  }
                >
                  {section.visibility === "public" ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                  {section.visibility === "public" ? "Hide" : "Show"}
                </Button>
                <Switch
                  checked={section.enabled}
                  aria-label="Enable section"
                  onCheckedChange={(checked) => {
                    shopStore.updateCmsSection(section.id, { enabled: checked });
                    toast.success(`${section.name} ${checked ? "enabled" : "disabled"}`);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
