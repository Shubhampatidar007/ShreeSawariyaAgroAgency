import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/home/SectionHeading";
import { ProductCard } from "@/components/home/ProductCard";
import { usePublicShopStore } from "@/lib/public-shop-store";
import { matchesStorefrontSearch, storefrontFilterStore, useStorefrontFilters } from "@/lib/storefront-filter-store";
import { useI18n } from "@/lib/i18n";
import type { CmsSection } from "@/types/operations";

export function FeaturedProducts({ content }: { content?: Pick<CmsSection, "headline" | "body"> }) {
  const { t } = useI18n();
  const published = usePublicShopStore((s) => s.products);
  const loading = usePublicShopStore((s) => s.loading);
  const searchQuery = useStorefrontFilters((s) => s.searchQuery);
  const selectedCategory = useStorefrontFilters((s) => s.selectedCategory);

  const cards = useMemo(() => {
    return published
      .filter((p) => p.stock > 0 || (p.variants ?? []).some((v) => v.stock > 0))
      .filter((p) => !selectedCategory || p.category === selectedCategory)
      .filter((p) => matchesStorefrontSearch(p, searchQuery))
      .map((p) => ({
        id: p.id,
        name: p.title,
        category: p.category,
        price: p.discountPrice ?? p.sellingPrice,
        unit: p.variants?.[0]?.label ?? "unit",
        ...(p.featured ? { tag: "Featured" } : {}),
        rating: 4.6,
        emoji: p.emoji || "🌾",
        image: p.images[0],
        stock: p.stock,
        variants: p.variants,
      }));
  }, [published, searchQuery, selectedCategory]);

  const hasFilter = Boolean(searchQuery.trim() || selectedCategory);

  return (
    <section id="products" className="bg-muted/50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow={t("home.featured.eyebrow")}
            title={content?.headline || t("home.featured.title")}
            description={content?.body || t("home.featured.description")}
          />
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading catalog…" : `${cards.length} ${cards.length === 1 ? "product" : "products"}`}
            </p>
            {hasFilter ? (
              <Button variant="outline" className="rounded-full" onClick={() => storefrontFilterStore.clear()}>
                Clear filters
              </Button>
            ) : null}
            <Button variant="outline" className="rounded-full" asChild>
              <a href="#categories">{t("home.featured.browse")}</a>
            </Button>
          </div>
        </div>

        {loading && published.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading published products…</p>
        ) : null}
        {!loading && cards.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="font-semibold">No matching products</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFilter ? "Try a different search or clear the current filters." : "No published in-stock products are available yet."}
            </p>
            {hasFilter ? (
              <Button className="mt-4 rounded-full" onClick={() => storefrontFilterStore.clear()}>Show all products</Button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
