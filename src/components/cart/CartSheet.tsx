import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cartCount, cartStore, cartSubtotal, useCart } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/shop-store";
import { useI18n } from "@/lib/i18n";

export function CartSheet() {
  const items = useCart();
  const { t } = useI18n();
  const count = cartCount(items);
  const subtotal = cartSubtotal(items);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={t("cart.title", "Your cart")}
        >
          <ShoppingCart className="size-5" />
          {count > 0 ? (
            <Badge className="absolute -right-0.5 -top-0.5 size-5 justify-center rounded-full p-0 text-[10px]">
              {count}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetTitle>{t("cart.title", "Your cart")}</SheetTitle>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <ShoppingCart className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">{t("cart.empty", "Your cart is empty")}</p>
            <p className="text-xs text-muted-foreground">
              {t("cart.emptyHelp", "Browse the catalogue and add items to get started.")}
            </p>
          </div>
        ) : (
          <>
            <div className="-mx-2 flex-1 space-y-3 overflow-y-auto px-2">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-xl border border-border p-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
                    {item.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.price)} / {item.unit}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-7 rounded-full"
                        aria-label={t("cart.decrease", "Decrease quantity")}
                        onClick={() => cartStore.setQty(item.id, item.qty - 1)}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-7 rounded-full"
                        aria-label={t("cart.increase", "Increase quantity")}
                        onClick={() => cartStore.setQty(item.id, item.qty + 1)}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto size-7 rounded-full text-muted-foreground"
                        aria-label={t("cart.remove", "Remove")}
                        onClick={() => cartStore.remove(item.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(item.price * item.qty)}</p>
                </div>
              ))}
            </div>

            <Separator />
            <div className="space-y-3 pb-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("cart.subtotal", "Subtotal")}</span>
                <span className="font-display text-lg font-semibold">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <Button
                className="w-full rounded-full"
                onClick={() =>
                  toast.info(
                    t("cart.checkoutSoon", "Checkout will be connected to online payments next."),
                  )
                }
              >
                {t("cart.checkout", "Proceed to checkout")}
              </Button>
              <Button
                variant="ghost"
                className="w-full rounded-full"
                onClick={() => cartStore.clear()}
              >
                {t("cart.clear", "Clear cart")}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
