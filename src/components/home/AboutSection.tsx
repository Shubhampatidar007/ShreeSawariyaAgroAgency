import { businessHighlights, shopInfo } from "@/data/storefront";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/home/SectionHeading";

export function AboutSection() {
  return (
    <section id="about" className="bg-card py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            eyebrow="About our shop"
            title="A krishi kendra farmers have trusted since 1998"
            description={`${shopInfo.name} started as a single seed counter on Mandi Road and now supplies inputs to more than 180 villages. Every sale is billed, every batch is traceable, and every customer gets straight advice on what their crop actually needs.`}
          />
          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Years in business", value: "27" },
              { label: "Registered societies", value: "34" },
              { label: "Field advisors", value: "6" },
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