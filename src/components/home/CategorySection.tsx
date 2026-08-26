import { useMemo } from "react";
import {
  ArrowUpRight,
  Bug,
  Check,
  Droplets,
  FlaskConical,
  Sprout,
  Wheat,
  Wrench,
} from "lucide-react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useI18n } from "@/lib/i18n";
import { usePublicShopStore } from "@/lib/public-shop-store";
import { storefrontFilterStore, useStorefrontFilters } from "@/lib/storefront-filter-store";
import type { CmsSection } from "@/types/operations";

const categoryMeta = [
  { name: "Seeds", icon: Sprout },
  { name: "Fertilizers", icon: FlaskConical },
  { name: "Crop Protection", icon: Bug },
  { name: "Agricultural Supplies", icon: Wheat },
  { name: "Irrigation", icon: Droplets },
  { name: "Farm Tools", icon: Wrench },
] as const;

export function CategorySection({ content }: { content?: Pick<CmsSection, "headline" | "body"> }) {
  const { t } = useI18n();
  const published = usePublicShopStore((state) => state.products);
  const loading = usePublicShopStore((state) => state.loading);
  const selectedCategory = useStorefrontFilters((state) => state.selectedCategory);

  const categories = useMemo(
    () =>
      categoryMeta.map(({ name, icon }) => ({
        name,
        icon,
        count: published.filter((product) => product.category.toLowerCase() === name.toLowerCase()).length,
      })),
    [published],
  );

  return (
    <section id="categories" className="mx-auto max-w-7xl px-6 py-10 sm:py-12 lg:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow={t("home.category.eyebrow", "Shop by category")}
          title={content?.headline || t("home.category.title", "Find what your farm needs")}
          description={content?.body || t("home.category.description", "Browse the categories in the live published catalog.")}
        />
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading catalog…" : `${published.length} published ${published.length === 1 ? "product" : "products"}`}
          </p>
          <Button
            type="button"
            variant={selectedCategory === null ? "default" : "outline"}
            className="rounded-full"
            onClick={() => storefrontFilterStore.setCategory(null)}
          >
            All Products
          </Button>
        </div>
      </div>

      <div className="mt-7 flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-6">
        {categories.map((category, index) => {
          const isSelected = selectedCategory === category.name;
          return (
            <motion.button
              key={category.name}
              type="button"
              onClick={() => {
                storefrontFilterStore.setCategory(isSelected ? null : category.name);
                document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              className="min-w-[158px] shrink-0 text-left sm:min-w-0"
            >
              <Card className={`h-full rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-lg ${isSelected ? "border-primary ring-2 ring-primary/20" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <category.icon className="size-5" />
                    </span>
                    {isSelected ? <Check className="mt-1 size-4 text-primary" /> : <ArrowUpRight className="mt-1 size-4 text-muted-foreground" />}
                  </div>
                  <h3 className="mt-4 font-display text-sm font-semibold">{category.name}</h3>
                  <p className={`mt-1 text-xs ${category.count > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {category.count > 0
                      ? `${category.count} ${category.count === 1 ? "product" : "products"}`
                      : "Not stocked yet"}
                  </p>
                </CardContent>
              </Card>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
