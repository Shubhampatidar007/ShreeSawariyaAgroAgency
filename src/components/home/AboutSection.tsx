import { useEffect, useState } from "react";
import { BadgeCheck, CircleCheck, Headphones, MapPinned, PackageCheck, ShoppingCart, Sparkles, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/home/SectionHeading";
import { getBusinessStats, type BusinessStats } from "@/lib/business-stats";
import { usePublicShopStore } from "@/lib/public-shop-store";
import { shopInfo } from "@/data/storefront";
import type { CmsSection } from "@/types/operations";

const trustBenefits = [
  { title: "Verified Products", description: "Genuine agricultural products.", icon: BadgeCheck },
  { title: "Competitive Prices", description: "Competitive local pricing.", icon: Tag },
  { title: "Farmer Support", description: "Help choosing products.", icon: Headphones },
  { title: "Local Expertise", description: "Knowledge of local farming needs.", icon: MapPinned },
  { title: "Easy Ordering", description: "Simple online ordering.", icon: ShoppingCart },
  { title: "Reliable Availability", description: "Clear current stock.", icon: PackageCheck },
] as const;

export function AboutSection({ content }: { content?: Pick<CmsSection, "headline" | "body"> }) {
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const testimonials = usePublicShopStore((state) => state.testimonials);
  const testimonialLoading = usePublicShopStore((state) => state.loading);

  useEffect(() => {
    void getBusinessStats().then(setStats).catch((error) => console.error("Unable to load business stats:", error));
  }, []);

  const statItems = stats
    ? [
        { label: "Years in business", value: `${stats.yearsInBusiness}+` },
        { label: "Customers served", value: stats.customersServed.toLocaleString("en-IN") },
        { label: "Services offered", value: String(stats.servicesOffered) },
      ]
    : [];

  return (
    <section id="about" className="bg-card py-16">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Why Shree Sanwariya Agro Agency"
          title={content?.headline || "A local agricultural store built around clear, dependable service"}
          description={content?.body || `Shree Sanwariya Agro Agency serves customers from ${shopInfo.address}. Our published catalog and live stock information are used to keep online ordering clear, while our verified business data reflects ${stats?.yearsInBusiness ?? "our"} years of business and ${stats?.customersServed?.toLocaleString("en-IN") ?? "our customers"} customers served.`}
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trustBenefits.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="group border-border/80 bg-background/70 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg">
              <CardContent className="p-5">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105"><Icon className="size-5" /></span>
                <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-border bg-muted/35 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Verified business statistics</p><h3 className="mt-1 font-display text-xl font-semibold">Numbers from your business data</h3></div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><CircleCheck className="size-4 text-primary" /> Live source: business_stats</div>
          </div>
          {statItems.length ? <dl className="mt-5 grid gap-3 sm:grid-cols-3">{statItems.map((item) => <div key={item.label} className="rounded-2xl border border-border bg-background p-4"><dd className="font-display text-2xl font-bold text-foreground">{item.value}</dd><dt className="mt-1 text-xs text-muted-foreground">{item.label}</dt></div>)}</dl> : <div className="mt-5 rounded-2xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">Business statistics are unavailable right now.</div>}
        </div>

        <section className="relative mt-10 overflow-hidden rounded-[2rem] border border-border bg-background px-5 py-9 sm:px-8 sm:py-11">
          <div className="absolute right-6 top-6 text-primary/70" aria-hidden="true"><Sparkles className="size-8" /></div>
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-primary/70" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">What Our Farmers Say</p>
            </div>

            {testimonialLoading && testimonials.length === 0 ? (
              <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((item) => <div key={item} className="h-[22rem] animate-pulse rounded-[1.25rem] border border-border/80 bg-muted/30" />)}
              </div>
            ) : testimonials.length ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {testimonials.slice(0, 3).map((testimonial) => {
                  const fallbackInitial = testimonial.name.trim().slice(0, 1).toUpperCase();
                  return (
                    <Card key={testimonial.id} className="group h-full overflow-hidden rounded-[1.4rem] border-border bg-card/80 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                      <CardContent className="flex min-h-[22rem] flex-col items-center px-6 py-8 text-center sm:px-7 sm:py-9">
                        {testimonial.imageUrl ? (
                          <img
                            src={testimonial.imageUrl}
                            alt={testimonial.name}
                            loading="lazy"
                            className="size-28 rounded-full border-4 border-background object-cover shadow-lg transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex size-28 items-center justify-center rounded-full border-4 border-background bg-muted text-3xl font-semibold text-foreground shadow-lg">
                            {fallbackInitial || "F"}
                          </div>
                        )}
                        <h3 className="mt-5 font-display text-xl font-semibold leading-tight text-foreground">{testimonial.name}</h3>
                        {(testimonial.location || testimonial.crop) && (
                          <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            {[testimonial.location, testimonial.crop].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        <blockquote className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">“{testimonial.quote}”</blockquote>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="mt-8 rounded-[1.25rem] border border-dashed border-border bg-muted/20 px-5 py-10 text-center text-sm text-muted-foreground">
                No verified testimonials are currently published.
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
