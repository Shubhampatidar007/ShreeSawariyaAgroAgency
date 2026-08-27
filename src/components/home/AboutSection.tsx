import { useEffect, useState } from "react";
import { BadgeCheck, CircleCheck, Headphones, MapPinned, PackageCheck, ShoppingCart, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/home/SectionHeading";
import { getBusinessStats, type BusinessStats } from "@/lib/business-stats";
import { shopInfo } from "@/data/storefront";
import { usePublicShopStore } from "@/lib/public-shop-store";
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
            <CardContent className="p-6 sm:p-9 lg:p-12">
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">What Our Customers Say</p>
                <h3 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Real experiences from our farmers</h3>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Trusted feedback from customers who have experienced our products and service.</p>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary">
                  <CircleCheck className="size-3.5" /> Verified customer stories
                </div>
              </div>

              {testimonialLoading && testimonials.length === 0 ? (
                <p className="mt-10 text-center text-sm text-muted-foreground">Checking verified testimonials…</p>
              ) : testimonials.length ? (
                <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {testimonials.slice(0, MAX_VISIBLE_TESTIMONIALS).map((testimonial, index) => (
                    <blockquote
                      key={testimonial.id}
                      className={`group relative flex min-h-[450px] h-full flex-col overflow-hidden rounded-[2rem] border bg-background p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl sm:p-8 ${
                        index === 0 ? "border-primary/35 ring-1 ring-primary/10" : "border-border/90"
                      }`}
                    >
                      <span className={`absolute right-5 top-5 flex size-12 items-center justify-center rounded-full text-sm font-bold tracking-[0.08em] ${
                        index === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`} aria-label={`Rank ${index + 1}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="flex flex-col items-center text-center">
                        <div className="flex size-28 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted text-2xl font-semibold text-primary shadow-lg ring-1 ring-border/80 transition-transform duration-300 group-hover:scale-[1.03]">
                          {testimonial.imageUrl ? (
                            <img src={testimonial.imageUrl} alt={`${testimonial.farmerName} photo`} width={112} height={112} loading="lazy" className="size-28 object-cover" />
                          ) : testimonial.farmerName.slice(0, 1).toUpperCase()}
                        </div>

                        <footer className="mt-5 min-w-0 text-center">
                          <span className="block font-display text-xl font-semibold text-foreground">{testimonial.farmerName}</span>
                          {testimonial.farmName ? <span className="mt-1.5 block text-base text-muted-foreground">{testimonial.farmName}</span> : null}
                          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                            <BadgeCheck className="size-3.5" /> Verified
                          </span>
                        </footer>
                      </div>

                      <div className="mt-7 flex flex-1 flex-col items-center border-t border-border pt-7 text-center">
                        <span className="mb-2 text-4xl font-display leading-none text-primary/45" aria-hidden="true">“</span>
                        <p className="max-w-sm text-base leading-8 text-foreground sm:text-[17px]">{testimonial.content}</p>
                      </div>
                    </blockquote>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
                  <h3 className="font-display text-xl font-semibold">Verified testimonials will appear here</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">No verified customer testimonials are currently published.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
