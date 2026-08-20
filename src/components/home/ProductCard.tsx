import { ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cartStore } from "@/lib/cart-store";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  const lowStock = product.stock > 0 && product.stock < 25;
  const outOfStock = product.stock <= 0;
  const { t } = useI18n();
  const salePrice = product.discountPrice ?? product.price;
  const hasDiscount = product.discountPrice != null && product.discountPrice < product.price;

  const addToCart = () => {
    if (outOfStock) {
      toast.error("This product is currently out of stock");
      return;
    }

    cartStore.add({
      id: product.id,
      title: product.name,
      price: salePrice,
      unit: product.unit,
      emoji: product.emoji,
    });
    toast.success(t("cart.added", "Added to cart"), { description: product.name });
  };

  return (
    <Card className="group h-full overflow-hidden shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative flex h-40 items-center justify-center bg-muted">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="text-5xl transition-transform duration-300 group-hover:scale-110">
            {product.emoji}
          </span>
        )}
        {product.tag ? (
          <Badge className="absolute left-3 top-3 rounded-full">{product.tag}</Badge>
        ) : null}
        {outOfStock ? (
          <Badge variant="secondary" className="absolute right-3 top-3 rounded-full">
            Out of stock
          </Badge>
        ) : null}
      </div>
      <CardContent className="space-y-2 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {product.category}
        </p>
        <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="size-3.5 fill-warning text-warning" />
          {product.rating.toFixed(1)}
          <span className="mx-1">·</span>
          <span className={lowStock ? "font-semibold text-destructive" : ""}>
            {outOfStock ? "Unavailable" : lowStock ? `Only ${product.stock} left` : "In stock"}
          </span>
        </div>
        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            <div className="flex items-baseline gap-2">
              <p className="font-display text-lg font-semibold">
                ₹{salePrice.toLocaleString("en-IN")}
              </p>
              {hasDiscount ? (
                <p className="text-xs text-muted-foreground line-through">
                  ₹{product.price.toLocaleString("en-IN")}
                </p>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">per {product.unit}</p>
          </div>
          <Button
            size="icon"
            className="rounded-full"
            aria-label={`Add ${product.name} to cart`}
            disabled={outOfStock}
            onClick={addToCart}
          >
            <ShoppingCart className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
