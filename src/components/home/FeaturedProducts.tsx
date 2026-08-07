import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/home/SectionHeading";
import { ProductCard } from "@/components/home/ProductCard";
import { featuredProducts } from "@/data/storefront";
import { useShopStore } from "@/lib/shop-store";
import { useI18n } from "@/lib/i18n";

export function FeaturedProducts() {
  const { t } = useI18n();
  const published = useShopStore((s) => s.products);

  const publishedCards = published
    .filter((p) => p.visibility === "public")
    .map((p) => ({
      id: p.id,
      name: p.title,
      category: p.category,
      price: p.discountPrice ?? p.sellingPrice,
      mrp: p.sellingPrice,
      unit: p.unit ?? "unit",
      badge: p.featured ? "Featured" : undefined,
      rating: 4.6,
      emoji: "🌾",
      stock: p.stock,
    }));

  const cards = [...publishedCards, ...featuredProducts].slice(0, 8);

  return (
    <section id="products" className="bg-muted/50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow={t("home.featured.eyebrow")}
            title={t("home.featured.title")}
            description={t("home.featured.description")}
          />
          <Button variant="outline" className="rounded-full" asChild>
            <a href="#categories">{t("home.featured.browse")}</a>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}