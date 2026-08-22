import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Image, LayoutTemplate, Save } from "lucide-react";
import { toast } from "sonner";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { shopStore, useShopStore } from "@/lib/shop-store";
import type { CmsSection } from "@/types/operations";

export const Route = createFileRoute("/admin/cms")({
  head: () => ({
    meta: [
      { title: "Homepage CMS — Admin" },
      { name: "description", content: "Manage homepage sections, copy, visibility and ordering." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CmsPage,
});

type Draft = Pick<CmsSection, "headline" | "body">;

function CmsPage() {
  const sections = useShopStore((s) => [...s.cmsSections].sort((a, b) => a.order - b.order));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      sections.forEach((section) => {
        if (!next[section.id])
          next[section.id] = { headline: section.headline, body: section.body };
      });
      return next;
    });
  }, [sections]);

  const setDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const save = async (section: CmsSection) => {
    const draft = drafts[section.id];
    if (!draft) return;
    try {
      await shopStore.updateCmsSection(section.id, draft);
      toast.success(`${section.name} saved`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save section");
    }
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Homepage CMS" }]}
        eyebrow="Storefront"
        title="Homepage content management"
        description="Every control here writes to cms_sections. Enabled/public/order and copy determine what the public homepage displays."
        actions={
          <Button variant="outline" className="rounded-full" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              <Eye className="size-4" /> Preview homepage
            </a>
          </Button>
        }
      />

      <div className="space-y-4">
        {sections.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No CMS sections are stored yet.
            </CardContent>
          </Card>
        ) : (
          sections.map((section, index) => {
            const draft = drafts[section.id] ?? { headline: section.headline, body: section.body };
            return (
              <Card key={section.id} className="shadow-soft transition-shadow hover:shadow-lg">
                <CardContent className="space-y-5 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <LayoutTemplate className="size-4 text-primary" />
                        <p className="font-display font-semibold">{section.name}</p>
                        <StatusBadge status={section.type} />
                        <StatusBadge
                          status={section.visibility === "public" ? "published" : "hidden"}
                        />
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            className="text-xs font-medium text-muted-foreground"
                            htmlFor={`headline-${section.id}`}
                          >
                            Headline
                          </label>
                          <Input
                            id={`headline-${section.id}`}
                            value={draft.headline}
                            onChange={(event) =>
                              setDraft(section.id, { headline: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label
                            className="text-xs font-medium text-muted-foreground"
                            htmlFor={`body-${section.id}`}
                          >
                            Body / description
                          </label>
                          <Textarea
                            id={`body-${section.id}`}
                            value={draft.body}
                            onChange={(event) => setDraft(section.id, { body: event.target.value })}
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Image className="size-3.5" /> {section.imageLabel || "No image mapped"}
                        </span>
                        <span>
                          Schedule: {section.scheduledFrom ?? "—"} → {section.scheduledTo ?? "—"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:w-44 lg:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => void save(section)}
                      >
                        <Save className="size-4" /> Save
                      </Button>
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
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
