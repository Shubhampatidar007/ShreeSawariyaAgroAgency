import { useEffect, useState } from "react";
import { BadgeCheck, CircleCheck, Headphones, MapPinned, PackageCheck, ShoppingCart, Tag } from "lucide-react";
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

const MAX_VISIBLE_TESTIMONIALS = 3;

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
          eyebrow="Why Shree Sawariya Agro Agency"
          title={content?.headline || "A local agricultural store built around clear, dependable service"}
          description={content?.body || `Shree Sawariya Agro Agency serves customers from ${shopInfo.address}. Our published catalog and live stock information are used to keep online ordering clear, while our verified business data reflects ${stats?.yearsInBusiness ?? "our"} years of business and ${stats?.customersServed?.toLocaleString("en-IN") ?? "our customers"} customers served.`}
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

        <div className="mt-10">
          <Card className="border-border bg-background shadow-soft">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">What Our Customers Say</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">What Our Customers Say</h3>
                </div>
                <p className="text-xs text-muted-foreground">Up to {MAX_VISIBLE_TESTIMONIALS} verified stories</p>
              </div>

              {testimonialLoading && testimonials.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">Checking verified testimonials…</p>
              ) : testimonials.length ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {testimonials.slice(0, MAX_VISIBLE_TESTIMONIALS).map((testimonial) => (
                    <blockquote key={testimonial.id} className="flex h-full flex-col rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-base font-semibold text-primary">
                          {testimonial.imageUrl ? (
                            <img src={testimonial.imageUrl} alt={`${testimonial.farmerName} photo`} width={64} height={64} loading="lazy" className="size-16 object-cover" />
                          ) : testimonial.farmerName.slice(0, 1).toUpperCase()}
                        </div>
                        <footer className="min-w-0 text-sm text-muted-foreground">
                          <span className="block font-semibold text-foreground">{testimonial.farmerName}</span>
                          {testimonial.farmName ? <span className="block mt-1">{testimonial.farmName}</span> : null}
                        </footer>
                      </div>
                      <p className="mt-5 text-base leading-7 text-foreground">“{testimonial.content}”</p>
                    </blockquote>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/30 p-6">
                  <h3 className="font-display text-xl font-semibold">Verified testimonials will appear here</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">No verified customer testimonials are currently published.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
