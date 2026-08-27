import { useMemo } from "react";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePublicShopStore } from "@/lib/public-shop-store";
import { storefrontFilterStore, useStorefrontFilters } from "@/lib/storefront-filter-store";

export function SmartShoppingSection() {
  const products = usePublicShopStore((state) => state.products);
  const loading = usePublicShopStore((state) => state.loading);
  const searchQuery = useStorefrontFilters((state) => state.searchQuery);

  const popularSearches = useMemo(() => {
    const values = new Set<string>();
    for (const product of products) {
      if (product.title.trim()) values.add(product.title.trim());
      if (product.category.trim()) values.add(product.category.trim());
      for (const tag of product.tags ?? []) {
        if (tag.trim()) values.add(tag.trim());
      }
    }
    return [...values].slice(0, 6);
  }, [products]);

  const showMatchingProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="mx-auto max-w-7xl px-6 pb-8 pt-2 lg:pb-10">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="p-5 sm:p-7 lg:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            Smart shopping
          </div>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            What are you looking for?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Search the live published catalog by product, category, tags, variants, and searchable details.
          </p>

          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => storefrontFilterStore.setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") showMatchingProducts();
              }}
              placeholder="Search seeds, fertilizers, pesticides, brands..."
              className="h-12 rounded-2xl bg-background pl-12 pr-4"
              aria-label="Search the published catalog"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <p className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Popular searches
            </p>
            {loading && popularSearches.length === 0 ? (
              <span className="text-sm text-muted-foreground">Loading catalog searches…</span>
            ) : null}
            {popularSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  storefrontFilterStore.setSearchQuery(term);
                  showMatchingProducts();
                }}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                {term}
              </button>
            ))}
            {!loading && popularSearches.length === 0 ? (
              <span className="text-sm text-muted-foreground">Popular searches will appear as products are published.</span>
            ) : null}
            {searchQuery ? (
              <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => storefrontFilterStore.clear()}>
                Clear search
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
