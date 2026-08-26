import { useMemo } from "react";
import { ArrowUpRight, Check, CircleX } from "lucide-react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/home/SectionHeading";
import { categories } from "@/data/storefront";
import { useI18n } from "@/lib/i18n";
import { usePublicShopStore } from "@/lib/public-shop-store";
import { storefrontFilterStore, useStorefrontFilters } from "@/lib/storefront-filter-store";
import type { CmsSection } from "@/types/operations";

export function CategorySection({ content }: { content?: Pick<CmsSection, "headline" | "body"> }) {
  const { t } = useI18n();
  const published = usePublicShopStore((s) => s.products);
  const loading = usePublicShopStore((s) => s.loading);
  const selectedCategory = useStorefrontFilters((s) => s.selectedCategory);

  const catalogCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of published) counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, itemCount]) => ({
        id: name,
        name,
        itemCount,
        description: "Published products in this catalog category",
        emoji: categories.find((item) => item.name.toLowerCase() === name.toLowerCase())?.emoji ?? "📦",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [published]);

  const cards = catalogCategories.length ? catalogCategories : categories;

  return (
    <section id="categories" className="mx-auto max-w-7xl px-6 py-16">
      <SectionHeading
        eyebrow={t("home.category.eyebrow")}
        title={content?.headline || t("home.category.title")}
        description={content?.body || t("home.category.description")}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={selectedCategory === null ? "default" : "outline"}
          className="rounded-full"
          onClick={() => storefrontFilterStore.setCategory(null)}
        >
          All Products {published.length > 0 ? `· ${published.length}` : ""}
        </Button>
        {selectedCategory ? (
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => storefrontFilterStore.setCategory(null)}>
            <CircleX className="size-4" /> Clear filter
          </Button>
        ) : null}
      </div>

      {loading && cards.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">Loading catalog categories…</p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((category, index) => {
          const isSelected = selectedCategory === category.id;
          return (
            <motion.button
              key={category.id}
              type="button"
              className="text-left"
              onClick={() => {
                storefrontFilterStore.setCategory(isSelected ? null : category.id);
                document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
            >
              <Card className={`group h-full shadow-soft transition-shadow hover:shadow-lg ${isSelected ? "ring-2 ring-primary" : ""}`}>
                <CardContent className="flex h-full items-start gap-4 p-5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-2xl">{category.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-base font-semibold">{category.name}</h3>
                      {isSelected ? <Check className="size-4 text-primary" /> : <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                    <p className="mt-3 text-xs font-semibold text-primary">
                      {category.itemCount} {category.itemCount === 1 ? "product" : "products"} in catalog
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
