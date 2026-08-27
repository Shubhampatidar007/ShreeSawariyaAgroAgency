import { useMemo } from "react";
import { BadgeCheck, Tags } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/home/SectionHeading";
import { usePublicShopStore } from "@/lib/public-shop-store";

export function TrustedBrandsSection() {
  const products = usePublicShopStore((state) => state.products);
  const loading = usePublicShopStore((state) => state.loading);

  const brands = useMemo(() => {
    const unique = new Set<string>();
    for (const product of products) {
      const value = product.brand?.trim();
      if (value) unique.add(value);
    }
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [products]);

  return (
    <section id="brands" className="bg-muted/35 py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Trusted brands we stock"
          title="Brands from the live catalog"
          description="Brand names appear here only when they are explicitly recorded in published product metadata."
        />

        {loading && products.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
            Checking the published catalog for brand information…
          </div>
        ) : brands.length ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {brands.map((brand) => (
              <Card key={brand} className="border-border bg-background shadow-soft transition-shadow hover:shadow-lg">
                <CardContent className="flex items-center gap-3 p-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BadgeCheck className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold">{brand}</p>
                    <p className="text-xs text-muted-foreground">Published catalog brand</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="mt-8 border-dashed bg-background shadow-none">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Tags className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">No brand metadata yet</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                The current published catalog does not contain explicit brand metadata, so no brand names are shown here. Add brand information to products and this section will update automatically.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
