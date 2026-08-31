import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroSection } from "@/components/home/HeroSection";
import { SmartShoppingSection } from "@/components/home/SmartShoppingSection";
import { FarmerAdvisorySection } from "@/components/home/FarmerAdvisorySection";
import { CategorySection } from "@/components/home/CategorySection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { OffersSection } from "@/components/home/OffersSection";
import { TrustedBrandsSection } from "@/components/home/TrustedBrandsSection";
import { AboutSection } from "@/components/home/AboutSection";
import { LocationSection } from "@/components/home/LocationSection";

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
  <FarmerAdvisorySection />
  <TrustedBrandsSection />
  <AboutSection />
  <LocationSection />
</main>
      <SiteFooter />
    </div>
  );
}
