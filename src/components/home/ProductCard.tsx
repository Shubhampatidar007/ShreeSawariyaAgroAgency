import { useMemo, useState } from "react";
import {
  Check,
  Heart,
  Minus,
  PackageCheck,
  Plus,
  ShoppingCart,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cartStore } from "@/lib/cart-store";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-store";
import type { Product } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useI18n();
  const authUser = useAuth();
  const variants = product.variants ?? [];
  const initialVariantId =
    variants.find((variant) => variant.stock > 0)?.id ?? variants[0]?.id ?? "";
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? variants[0],
    [selectedVariantId, variants],
  );

  const price = selectedVariant?.discountPrice ?? selectedVariant?.sellingPrice ?? product.price;
  const originalPrice = selectedVariant?.discountPrice ? selectedVariant.sellingPrice : undefined;
  const discountPercent = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
  const unit = selectedVariant?.label ?? product.unit;
  const stock = selectedVariant?.stock ?? product.stock;
  const isUnavailable = stock <= 0;
  const lowStock = stock > 0 && stock < 10;

  const addToCart = () => {
    if (!selectedVariant || isUnavailable) {
      toast.error(isUnavailable ? "This variant is out of stock." : "This product is missing a product variant.");
      return;
    }

    cartStore.add(
      {
        id: `${product.id}:${selectedVariant.id}`,
        title: product.name,
        price,
        unit,
        emoji: product.emoji,
        productId: product.id,
        productVariantId: selectedVariant.id,
      },
      quantity,
    );
    toast.success(t("cart.added", "Added to cart"), {
      description: `${product.name} · ${unit}`,
    });
  };

  const toggleWishlist = () => {
    setIsWishlisted((current) => !current);
    toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist", {
      description: product.name,
    });
  };

  const updateQuantity = (delta: number) => {
    setQuantity((current) => Math.min(Math.max(1, current + delta), Math.max(1, stock)));
  };

  return (
    <>
      <Card className="group h-full overflow-hidden border-border/80 bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted/40">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-background">
              <span className="text-6xl transition-transform duration-500 group-hover:scale-110">{product.emoji}</span>
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {discountPercent > 0 ? (
              <Badge className="rounded-full bg-destructive px-2.5 py-1 text-[10px] font-bold text-destructive-foreground">
                {discountPercent}% OFF
              </Badge>
            ) : null}
            {product.tag ? <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px]">{product.tag}</Badge> : null}
          </div>

          <button
            type="button"
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            onClick={toggleWishlist}
            className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full border border-border/80 bg-card/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-card hover:text-primary"
          >
            <Heart className={`size-4 ${isWishlisted ? "fill-current text-primary" : ""}`} />
          </button>

          {isUnavailable ? (
            <div className="absolute inset-x-0 bottom-0 bg-background/90 px-3 py-2 text-center text-xs font-semibold text-destructive backdrop-blur-sm">
              Currently unavailable
            </div>
          ) : null}
        </div>

        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{product.category}</p>
            <h3 className="mt-1 line-clamp-2 min-h-10 font-display text-base font-semibold leading-snug">{product.name}</h3>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Star className="size-3.5 fill-warning text-warning" />
              {product.rating.toFixed(1)}
            </div>
            <span className={isUnavailable ? "font-semibold text-destructive" : lowStock ? "font-semibold text-amber-600" : "font-medium text-primary"}>
              {isUnavailable ? "Out of stock" : lowStock ? `Only ${stock} left` : "In stock"}
            </span>
          </div>

          {variants.length > 1 ? (
            <Select value={selectedVariant?.id ?? ""} onValueChange={setSelectedVariantId}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Choose variant" />
              </SelectTrigger>
              <SelectContent>
                {variants.map((variant) => {
                  const variantDiscount = variant.discountPrice && variant.sellingPrice > variant.discountPrice
                    ? `${Math.round(((variant.sellingPrice - variant.discountPrice) / variant.sellingPrice) * 100)}% off`
                    : "";
                  return (
                    <SelectItem key={variant.id} value={variant.id} disabled={variant.stock <= 0}>
                      {variant.label} · ₹{(variant.discountPrice ?? variant.sellingPrice).toLocaleString("en-IN")}{variantDiscount ? ` · ${variantDiscount}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              <PackageCheck className="size-3.5 text-primary" />
              {unit}
            </div>
          )}

          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-2">
                <p className="font-display text-xl font-bold">₹{price.toLocaleString("en-IN")}</p>
                {originalPrice ? <p className="text-xs text-muted-foreground line-through">₹{originalPrice.toLocaleString("en-IN")}</p> : null}
              </div>
              <p className="text-[11px] text-muted-foreground">per {unit}</p>
            </div>
            {originalPrice ? <span className="text-[11px] font-semibold text-primary">Save ₹{(originalPrice - price).toLocaleString("en-IN")}</span> : null}
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-2 pt-1">
            <div className="flex items-center rounded-xl border border-border bg-background">
              <Button type="button" variant="ghost" size="icon" className="size-9 rounded-xl" onClick={() => updateQuantity(-1)} disabled={quantity <= 1} aria-label="Decrease quantity">
                <Minus className="size-3.5" />
              </Button>
              <span className="w-7 text-center text-sm font-semibold">{quantity}</span>
              <Button type="button" variant="ghost" size="icon" className="size-9 rounded-xl" onClick={() => updateQuantity(1)} disabled={isUnavailable || quantity >= stock} aria-label="Increase quantity">
                <Plus className="size-3.5" />
              </Button>
            </div>
            {authUser?.role !== "admin" ? (
              <Button className="rounded-xl" disabled={isUnavailable} onClick={addToCart}>
                <ShoppingCart className="size-4" />
                Quick Add
              </Button>
            ) : null}
          </div>

          <Button type="button" variant="outline" className="mt-auto w-full rounded-xl" onClick={() => setDetailsOpen(true)}>
            View product details
          </Button>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl overflow-hidden rounded-2xl p-0">
          <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
            <div className="flex min-h-64 items-center justify-center bg-muted/50 p-6">
              {product.image ? (
                <img src={product.image} alt={product.name} className="max-h-72 w-full object-contain" />
              ) : (
                <span className="text-7xl">{product.emoji}</span>
              )}
            </div>
            <div className="p-6">
              <DialogHeader>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{product.category}</p>
                <DialogTitle className="mt-1 text-2xl">{product.name}</DialogTitle>
                <DialogDescription>
                  {product.rating.toFixed(1)} rating · {isUnavailable ? "Currently unavailable" : `${stock} units available`}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 flex items-end gap-3">
                <p className="font-display text-3xl font-bold">₹{price.toLocaleString("en-IN")}</p>
                {originalPrice ? <p className="text-sm text-muted-foreground line-through">₹{originalPrice.toLocaleString("en-IN")}</p> : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">per {unit}</p>

              {variants.length > 1 ? (
                <div className="mt-5">
                  <p className="mb-2 text-sm font-semibold">Choose variant</p>
                  <Select value={selectedVariant?.id ?? ""} onValueChange={setSelectedVariantId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Choose variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id} disabled={variant.stock <= 0}>
                          {variant.label} · ₹{(variant.discountPrice ?? variant.sellingPrice).toLocaleString("en-IN")} · {variant.stock > 0 ? `${variant.stock} in stock` : "Out of stock"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Variant</p>
                  <p className="mt-1 text-sm font-semibold">{unit}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Availability</p>
                  <p className={`mt-1 text-sm font-semibold ${isUnavailable ? "text-destructive" : "text-primary"}`}>
                    {isUnavailable ? "Out of stock" : `${stock} available`}
                  </p>
                </div>
              </div>

              {product.variants?.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <span key={variant.id} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${variant.id === selectedVariant?.id ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                      {variant.id === selectedVariant?.id ? <Check className="size-3" /> : null}
                      {variant.label}
                    </span>
                  ))}
                </div>
              ) : null}

              {authUser?.role !== "admin" ? (
                <Button className="mt-6 w-full rounded-xl" disabled={isUnavailable} onClick={() => { addToCart(); setDetailsOpen(false); }}>
                  <ShoppingCart className="size-4" />
                  Add selected variant to cart
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
