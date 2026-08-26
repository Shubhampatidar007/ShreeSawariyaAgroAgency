import { ArrowUpRight, PackageCheck, ShoppingCart, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/home/SectionHeading";
import { storefrontFilterStore } from "@/lib/storefront-filter-store";
import { usePublicShopStore } from "@/lib/public-shop-store";
import type { CmsSection } from "@/types/operations";
import type { PublishedProduct, ProductVariant } from "@/types/business";

function getDiscountedVariant(product: PublishedProduct): ProductVariant | null {
  const variants = (product.variants ?? []).filter(
    (variant) =>
      variant.status === "active" &&
      variant.stock > 0 &&
      typeof variant.discountPrice === "number" &&
      variant.discountPrice < variant.sellingPrice,
  );

  if (!variants.length) return null;

  return [...variants].sort((a, b) => {
    const aDiscount = (a.sellingPrice - (a.discountPrice ?? a.sellingPrice)) / a.sellingPrice;
    const bDiscount = (b.sellingPrice - (b.discountPrice ?? b.sellingPrice)) / b.sellingPrice;
    return bDiscount - aDiscount;
  })[0];
}

export function OffersSection({ content }: { content?: Pick<CmsSection, "headline" | "body"> }) {
  const published = usePublicShopStore((s) => s.products);
  const loading = usePublicShopStore((s) => s.loading);

  const deals = published
    .map((product) => {
      const variant = getDiscountedVariant(product);
      if (!variant) return null;

      const currentPrice = variant.discountPrice ?? variant.sellingPrice;
      const discountPercent = Math.round(
        ((variant.sellingPrice - currentPrice) / variant.sellingPrice) * 100,
      );

      return {
        product,
        variant,
        currentPrice,
        discountPercent,
      };
    })
    .filter(Boolean) as Array<{
    product: PublishedProduct;
    variant: ProductVariant;
    currentPrice: number;
    discountPercent: number;
  }>;

  const openDeal = (product: PublishedProduct) => {
    storefrontFilterStore.setCategory(null);
    storefrontFilterStore.setSearchQuery(product.title);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="offers" className="mx-auto max-w-7xl px-6 py-16">
      <SectionHeading
        eyebrow="Deals for farmers"
        title={content?.headline || "Real savings on selected products"}
        description={
          content?.body ||
          "Browse published products with genuine variant-level discounts from the current catalog."
        }
      />

      {loading ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-soft">
          Checking current catalog discounts…
        </div>
      ) : null}

      {!loading && deals.length === 0 ? (
        <Card className="mt-8 shadow-soft">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Tag className="size-4" />
                <p className="font-semibold">No active catalog discounts</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Deals will appear here automatically when published variants have a real discounted price.
              </p>
            </div>
            <Button className="rounded-full" asChild>
              <a href="#products">Browse products</a>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!loading && deals.length > 0 ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {deals.map(({ product, variant, currentPrice, discountPercent }) => {
            const originalPrice = variant.sellingPrice;
            const stockLabel = variant.stock < 10 ? `Only ${variant.stock} left` : `${variant.stock} in stock`;

            return (
              <Card
                key={`${product.id}:${variant.id}`}
                className="group overflow-hidden border-border/80 bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted/40">
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-background">
                      <span className="text-6xl transition-transform duration-500 group-hover:scale-110">
                        {product.emoji || "🌾"}
                      </span>
                    </div>
                  )}
                  <Badge className="absolute left-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-bold text-destructive-foreground">
                    {discountPercent}% OFF
                  </Badge>
                </div>

                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {product.category}
                      </p>
                      <h3 className="mt-1 line-clamp-2 font-display text-lg font-semibold leading-snug">
                        {product.title}
                      </h3>
                    </div>
                    <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5">
                      <PackageCheck className="size-3.5 text-primary" />
                      <span className="font-medium">{variant.label}</span>
                    </div>
                    <span className={variant.stock < 10 ? "font-semibold text-amber-600" : "font-medium text-primary"}>
                      {stockLabel}
                    </span>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <p className="font-display text-2xl font-bold">
                          ₹{currentPrice.toLocaleString("en-IN")}
                        </p>
                        <p className="text-sm text-muted-foreground line-through">
                          ₹{originalPrice.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">per {variant.label}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      Save ₹{(originalPrice - currentPrice).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <Button className="w-full rounded-xl" onClick={() => openDeal(product)}>
                    <ShoppingCart className="size-4" />
                    Shop Now
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
