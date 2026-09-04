import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroSection } from "@/components/home/HeroSection";
import { SmartShoppingSection } from "@/components/home/SmartShoppingSection";
import { CategorySection } from "@/components/home/CategorySection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { OffersSection } from "@/components/home/OffersSection";
import { AboutSection } from "@/components/home/AboutSection";
import { LocationSection } from "@/components/home/LocationSection";

const title = "Shree Sanwariya Agro Agency";
const description = "Shree Sanwariya Agro Agency is your local agricultural store for seeds, fertilizers, crop protection products, farm supplies, and practical support for farmers.";

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
    <div id="top" className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader />
     <main>
  <HeroSection />
  <SmartShoppingSection />
  <CategorySection />
  <FeaturedProducts />
  <OffersSection />
  <AboutSection />
  <LocationSection />
</main>
      <SiteFooter />
    </div>
  );
}
