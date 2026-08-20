import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/home/SectionHeading";
import { ProductCard } from "@/components/home/ProductCard";
import { featuredProducts } from "@/data/storefront";
import { useShopStore } from "@/lib/shop-store";
import { useI18n } from "@/lib/i18n";
import type { CmsSection } from "@/types/operations";

export function FeaturedProducts({ content }: { content?: Pick<CmsSection, "headline" | "body"> }) {
  const { t } = useI18n();
  const published = useShopStore((s) => s.products);
  const publishedCards = published
    .filter((p) => p.visibility === "public" && p.status === "published")
    .map((p) => ({
      id: p.id,
      name: p.title,
      category: p.category,
      price: p.sellingPrice,
      discountPrice: p.discountPrice,
      unit: "unit",
      ...(p.featured ? { tag: "Featured" } : {}),
      rating: 4.6,
      emoji: p.emoji || "🌾",
      image: p.images[0],
      stock: p.stock,
    }));
  const cards = [...publishedCards, ...featuredProducts].slice(0, 8);

  return (
    <section id="products" className="bg-muted/50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow={t("home.featured.eyebrow")}
            title={content?.headline || t("home.featured.title")}
            description={content?.body || t("home.featured.description")}
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
