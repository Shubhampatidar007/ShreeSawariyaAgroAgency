import { useMemo, useState } from "react";
import { ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cartStore } from "@/lib/cart-store";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-store";
import type { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useI18n();
  const authUser = useAuth();
  const variants = product.variants ?? [];
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? variants[0],
    [selectedVariantId, variants],
  );

  const price = selectedVariant?.discountPrice ?? selectedVariant?.sellingPrice ?? product.price;
  const unit = selectedVariant?.label ?? product.unit;
  const stock = selectedVariant?.stock ?? product.stock;
  const lowStock = stock < 25;

  const addToCart = () => {
    if (!selectedVariant) {
      toast.error("This product is missing a product variant.");
      return;
    }

    cartStore.add({
      id: `${product.id}:${selectedVariant.id}`,
      title: product.name,
      price,
      unit,
      emoji: product.emoji,
      productId: product.id,
      productVariantId: selectedVariant.id,
    });
    toast.success(t("cart.added", "Added to cart"), {
      description: `${product.name} · ${unit}`,
    });
  };

  return (
    <Card className="group h-full overflow-hidden shadow-soft transition-shadow hover:shadow-lg">
      <div className="relative flex h-36 items-center justify-center bg-muted">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="text-5xl transition-transform group-hover:scale-110">{product.emoji}</span>
        )}
        {product.tag ? <Badge className="absolute left-3 top-3 rounded-full">{product.tag}</Badge> : null}
      </div>
      <CardContent className="space-y-2 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {product.category}
        </p>
        <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug">{product.name}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="size-3.5 fill-warning text-warning" />
          {product.rating.toFixed(1)}
          <span className="mx-1">·</span>
          <span className={lowStock ? "font-semibold text-destructive" : ""}>
            {lowStock ? `Only ${stock} left` : "In stock"}
          </span>
        </div>

        {variants.length > 1 ? (
          <Select value={selectedVariant?.id ?? ""} onValueChange={setSelectedVariantId}>
            <SelectTrigger className="h-9 rounded-lg">
              <SelectValue placeholder="Choose quantity" />
            </SelectTrigger>
            <SelectContent>
              {variants.map((variant) => (
                <SelectItem key={variant.id} value={variant.id} disabled={variant.stock <= 0}>
                  {variant.label} · ₹{(variant.discountPrice ?? variant.sellingPrice).toLocaleString("en-IN")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            <p className="font-display text-lg font-semibold">₹{price.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">per {unit}</p>
          </div>
          {authUser?.role !== "admin" ? (
            <Button
              size="icon"
              className="rounded-full"
              aria-label={`Add ${product.name} ${unit} to cart`}
              disabled={stock <= 0}
              onClick={addToCart}
            >
              <ShoppingCart className="size-4" />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
