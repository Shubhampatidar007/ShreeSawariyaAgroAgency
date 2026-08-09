import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroSection } from "@/components/home/HeroSection";
import { CategorySection } from "@/components/home/CategorySection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { OffersSection } from "@/components/home/OffersSection";
import { AboutSection } from "@/components/home/AboutSection";

const title = "Your Shop";
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

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <HeroSection />
        <CategorySection />
        <FeaturedProducts />
        <OffersSection />
        <AboutSection />
      </main>
      <SiteFooter />
    </div>
  );
}
