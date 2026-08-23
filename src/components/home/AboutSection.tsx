import { useEffect, useState } from "react";
import { businessHighlights, shopInfo } from "@/data/storefront";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/home/SectionHeading";
import { getBusinessStats, type BusinessStats } from "@/lib/business-stats";
import type { CmsSection } from "@/types/operations";

export function AboutSection({ content }: { content?: Pick<CmsSection, "headline" | "body"> }) {
  const [stats, setStats] = useState<BusinessStats | null>(null);

  useEffect(() => {
    void getBusinessStats()
      .then(setStats)
      .catch((error) => {
        console.error("Unable to load business stats:", error);
      });
  }, []);

  return (
    <section id="about" className="bg-card py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            eyebrow="About your shop"
            title={content?.headline || "Tell customers what makes your business special"}
            description={
              content?.body ||
              `${shopInfo.name} can share its story, services, and contact details here once the real content is ready.`
            }
          />
          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Years in business", value: stats ? String(stats.yearsInBusiness) : "—" },
              { label: "Customers served", value: stats ? String(stats.customersServed) : "—" },
              { label: "Services offered", value: stats ? String(stats.servicesOffered) : "—" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-muted/50 p-4">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 font-display text-2xl font-semibold">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {businessHighlights.map((highlight) => (
            <Card key={highlight.title} className="shadow-soft">
              <CardContent className="space-y-2 p-5">
                <span className="text-2xl">{highlight.emoji}</span>
                <h3 className="font-display text-sm font-semibold">{highlight.title}</h3>
                <p className="text-sm text-muted-foreground">{highlight.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
