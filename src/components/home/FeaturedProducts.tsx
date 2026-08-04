import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/home/SectionHeading";
import { ProductCard } from "@/components/home/ProductCard";
import { featuredProducts } from "@/data/storefront";

export function FeaturedProducts() {
  return (
    <section id="products" className="bg-muted/50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Featured this season"
            title="Fast-moving inputs for the current sowing window"
            description="Rates reviewed every morning. Society and bulk buyers get slab pricing on request."
          />
          <Button variant="outline" className="rounded-full" asChild>
            <a href="#categories">Browse full catalogue</a>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}