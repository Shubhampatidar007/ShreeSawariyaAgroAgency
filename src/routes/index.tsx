import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Megaphone } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroSection } from "@/components/home/HeroSection";
import { SmartShoppingSection } from "@/components/home/SmartShoppingSection";
import { FarmerAdvisorySection } from "@/components/home/FarmerAdvisorySection";
import { CategorySection } from "@/components/home/CategorySection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { OffersSection } from "@/components/home/OffersSection";
import { AboutSection } from "@/components/home/AboutSection";
import { LocationSection } from "@/components/home/LocationSection";
import { usePublicShopStore } from "@/lib/public-shop-store";
import type { CmsSection } from "@/types/operations";

const title = "Shree Sawariya Agro Agency";
const description = "Add your own products, offers, and story to this storefront.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

const isActive = (section: CmsSection) => {
  if (!section.enabled || section.visibility !== "public") return false;
  const now = Date.now();
  if (section.scheduledFrom && new Date(section.scheduledFrom).getTime() > now) return false;
  if (section.scheduledTo && new Date(section.scheduledTo).getTime() < now) return false;
  return true;
};

function Index() {
  const sections = usePublicShopStore((s) => [...s.cmsSections].sort((a, b) => a.order - b.order));
  const cms = sections.length ? sections.filter(isActive) : null;
  return (
    <div id="top" className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader />
      <main>
        {!cms ? (
          <>
            <HeroSection />
            <SmartShoppingSection />
            <CategorySection />
            <FeaturedProducts />
            <OffersSection />
            <FarmerAdvisorySection />
            <AboutSection />
            <LocationSection />
          </>
        ) : (
          cms.map((section) => <CmsRender key={section.id} section={section} />)
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function CmsRender({ section }: { section: CmsSection }) {
  if (section.type === "hero") return <HeroSection content={section} />;
  if (section.type === "categories") return <CategorySection content={section} />;
  if (section.type === "featured") return <FeaturedProducts content={section} />;
  if (section.type === "offers") return <OffersSection content={section} />;
  if (section.type === "poster") return <PosterSection section={section} />;
  return <AnnouncementSection section={section} />;
}

function PosterSection({ section }: { section: CmsSection }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="overflow-hidden rounded-3xl border border-border bg-muted/50 p-8 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Megaphone className="size-5" /></div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">{section.name}</p><h2 className="mt-2 font-display text-2xl font-semibold">{section.headline}</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{section.body}</p></div>
        </div>
      </div>
    </section>
  );
}

function AnnouncementSection({ section }: { section: CmsSection }) {
  return <section className="bg-primary/5 px-6 py-8"><div className="mx-auto flex max-w-7xl items-start gap-3 rounded-2xl border border-primary/20 bg-card px-5 py-4 shadow-soft"><AlertCircle className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="text-sm font-semibold">{section.headline}</p><p className="mt-1 text-sm text-muted-foreground">{section.body}</p></div></div></section>;
}
