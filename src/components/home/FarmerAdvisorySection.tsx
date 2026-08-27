import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCard } from "@/components/home/ProductCard";
import { usePublicShopStore } from "@/lib/public-shop-store";
import { matchesStorefrontSearch, storefrontFilterStore } from "@/lib/storefront-filter-store";
import type { Product } from "@/types";

const crops = ["Wheat", "Soybean", "Cotton", "Maize", "Vegetables"] as const;

export function FarmerAdvisorySection() {
  const products = usePublicShopStore((state) => state.products);
  const loading = usePublicShopStore((state) => state.loading);
  const [selectedCrop, setSelectedCrop] = useState<(typeof crops)[number] | null>(null);

  const recommendations = useMemo(() => {
    if (!selectedCrop) return [];

    return products
      .filter((product) =>
        (product.stock > 0 || (product.variants ?? []).some((variant) => variant.stock > 0)) &&
        matchesStorefrontSearch(product, selectedCrop),
      )
      .slice(0, 3)
      .map((product): Product => ({
        id: product.id,
        name: product.title,
        category: product.category,
        price: product.discountPrice ?? product.sellingPrice,
        unit: product.variants?.[0]?.label ?? "unit",
        rating: 4.6,
        emoji: product.emoji || "🌱",
        image: product.images[0],
        stock: product.stock,
        variants: product.variants,
      }));
  }, [products, selectedCrop]);

  const getRecommendations = (crop: (typeof crops)[number]) => {
    setSelectedCrop(crop);
    storefrontFilterStore.setSearchQuery(crop);
    storefrontFilterStore.setCategory(null);
  };

  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="farmer-advisory" className="mx-auto max-w-7xl px-6 py-16">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <Sprout className="size-3.5" />
              Farmer advisory
            </div>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Need help choosing a product?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
              Choose a crop and we&apos;ll match it against the products currently published in the catalog.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2">
              {crops.map((crop) => {
                const selected = selectedCrop === crop;
                return (
                  <button
                    key={crop}
                    type="button"
                    onClick={() => getRecommendations(crop)}
                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{crop}</span>
                      {selected ? <CheckCircle2 className="size-4 text-primary" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <Button
              className="mt-5 rounded-full"
              disabled={!selectedCrop}
              onClick={() => {
                if (selectedCrop) scrollToProducts();
              }}
            >
              Get Recommendations
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
            {!selectedCrop ? (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sprout className="size-7" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">Start with your crop</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Recommendations will use only real published catalog data.
                </p>
              </div>
            ) : loading ? (
              <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
                Checking the published catalog…
              </div>
            ) : recommendations.length ? (
              <div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Recommended from catalog</p>
                    <h3 className="mt-1 font-display text-xl font-semibold">Products for {selectedCrop}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Matched from published product details</p>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {recommendations.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ) : (
              <Card className="min-h-64 border-dashed shadow-none">
                <CardContent className="flex h-full min-h-64 flex-col items-center justify-center p-6 text-center">
                  <h3 className="font-display text-lg font-semibold">No matching products yet</h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    No published product currently mentions {selectedCrop} in its searchable catalog data.
                  </p>
                  <Button variant="outline" className="mt-4 rounded-full" onClick={scrollToProducts}>
                    Browse all products
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
