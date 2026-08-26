import { useMemo, useState } from "react";
import { Clock, LogOut, Mail, Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { AuthDialog, type AuthMode } from "@/components/auth/AuthDialog";
import { CartSheet } from "@/components/cart/CartSheet";
import { authStore, useAuth } from "@/lib/auth-store";
import { cartStore } from "@/lib/cart-store";
import { useI18n } from "@/lib/i18n";
import { storefrontNav } from "@/data/navigation";
import { shopInfo } from "@/data/storefront";
import { usePublicShopStore } from "@/lib/public-shop-store";
import { storefrontFilterStore, useStorefrontFilters, matchesStorefrontSearch } from "@/lib/storefront-filter-store";
import type { PublishedProduct } from "@/types/business";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const user = useAuth();
  const { t } = useI18n();
  const products = usePublicShopStore((s) => s.products);
  const loading = usePublicShopStore((s) => s.loading);
  const searchQuery = useStorefrontFilters((s) => s.searchQuery);

  const results = useMemo(
    () => products.filter((product) => matchesStorefrontSearch(product, searchQuery)).slice(0, 6),
    [products, searchQuery],
  );

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="hidden border-b border-border bg-muted text-muted-foreground md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2 text-xs">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><span>{shopInfo.phone}</span></span>
            <span className="flex items-center gap-1.5"><Mail className="size-3.5" /> {shopInfo.email}</span>
          </div>
          <span className="flex items-center gap-1.5"><Clock className="size-3.5" /> {shopInfo.hours}</span>
        </div>
      </div>

      <div className="border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:px-6">
          <Logo />
          <SearchBox products={results} loading={loading} />

          <div className="ml-auto flex items-center gap-1.5">
            <LanguageToggle className="rounded-full" />
            <ThemeToggle className="rounded-full" />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full"><User className="size-4" /><span className="hidden sm:inline">{user.name.split(" ")[0]}</span></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="flex flex-col">
                    <span>{user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user.mobile}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === "admin" || user.role === "staff" ? (
                    <DropdownMenuItem asChild>
                      <a href="/admin"><User className="size-4" />Admin Panel</a>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={() => authStore.logout()}><LogOut className="size-4" />{t("common.logout", "Logout")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" className="hidden rounded-full sm:inline-flex" onClick={() => openAuth("login")}>
                <User className="size-4" />{t("auth.login", "Login")}
              </Button>
            )}
            {user?.role !== "admin" ? <CartSheet /> : null}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu"><Menu className="size-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetTitle>Store menu</SheetTitle>
                <div className="mt-5 lg:hidden">
                  <SearchBox products={results} loading={loading} mobile />
                </div>
                <nav className="mt-6 flex flex-col gap-1">
                  {storefrontNav.map((item) => (
                    <a key={item.label} href={item.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                      {t(`storefront.nav.${item.label.toLowerCase()}`, item.label)}
                    </a>
                  ))}
                  {!user ? (
                    <button type="button" onClick={() => { setOpen(false); openAuth("login"); }} className="rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted">
                      {t("auth.login", "Login")}
                    </button>
                  ) : null}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <nav className="hidden border-b border-border bg-background/95 backdrop-blur lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-6">
          {storefrontNav.map((item) => (
            <a key={item.label} href={item.to} className="px-3.5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              {t(`storefront.nav.${item.label.toLowerCase()}`, item.label)}
            </a>
          ))}
        </div>
      </nav>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} mode={authMode} onModeChange={setAuthMode} />
    </header>
  );
}

function SearchBox({ products, loading, mobile = false }: { products: PublishedProduct[]; loading: boolean; mobile?: boolean }) {
  const searchQuery = useStorefrontFilters((s) => s.searchQuery);
  const active = searchQuery.trim().length > 0;

  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={`relative ${mobile ? "w-full" : "ml-4 hidden flex-1 lg:block"}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={searchQuery}
        onChange={(event) => storefrontFilterStore.setSearchQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && searchQuery.trim()) scrollToProducts();
        }}
        placeholder="Search products, categories, variants…"
        className="h-11 rounded-full bg-muted pl-10 pr-10"
        aria-label="Search products"
      />
      {searchQuery ? (
        <button type="button" aria-label="Clear search" onClick={() => storefrontFilterStore.setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground">
          <X className="size-4" />
        </button>
      ) : null}

      {active ? (
        <div className="absolute left-0 right-0 top-12 z-50 rounded-2xl border border-border bg-card p-2 shadow-lg">
          {loading ? <p className="px-3 py-4 text-sm text-muted-foreground">Searching the catalog…</p> : null}
          {!loading && products.length === 0 ? <p className="px-3 py-4 text-sm text-muted-foreground">No products match “{searchQuery}”.</p> : null}
          {!loading && products.length > 0 ? products.map((product) => (
            <div key={product.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">{product.emoji}</span>
              <button type="button" className="min-w-0 flex-1 text-left" onClick={scrollToProducts}>
                <p className="truncate text-sm font-medium">{product.title}</p>
                <p className="truncate text-xs text-muted-foreground">{product.category} · {product.variants?.[0]?.label ?? "unit"}</p>
              </button>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">₹{(product.variants?.[0]?.discountPrice ?? product.variants?.[0]?.sellingPrice ?? product.discountPrice ?? product.sellingPrice).toLocaleString("en-IN")}</p>
                {product.variants?.length ? <p className="text-[10px] text-muted-foreground">{product.variants.length} variants</p> : null}
              </div>
              <Button size="icon" className="size-8 shrink-0 rounded-full" disabled={!(product.variants?.some((variant) => variant.stock > 0))} aria-label={`Add ${product.title} to cart`} onClick={() => addSearchProductToCart(product)}>
                <ShoppingCart className="size-3.5" />
              </Button>
            </div>
          )) : null}
          {!loading && products.length > 0 ? <button type="button" onClick={scrollToProducts} className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-primary/5">View all matching products</button> : null}
        </div>
      ) : null}
    </div>
  );
}

function addSearchProductToCart(product: PublishedProduct) {
  const variant = (product.variants ?? []).find((item) => item.stock > 0);
  if (!variant) {
    toast.error("This product is out of stock.");
    return;
  }
  const price = variant.discountPrice ?? variant.sellingPrice;
  cartStore.add({
    id: `${product.id}:${variant.id}`,
    title: product.title,
    price,
    unit: variant.label,
    emoji: product.emoji,
    productId: product.id,
    productVariantId: variant.id,
  });
  toast.success("Added to cart", { description: `${product.title} · ${variant.label}` });
}
