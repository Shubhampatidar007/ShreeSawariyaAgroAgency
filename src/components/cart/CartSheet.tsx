import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cartCount, cartStore, cartSubtotal, useCart } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/shop-store";
import { usePublicShopStore } from "@/lib/public-shop-store";
import { useI18n } from "@/lib/i18n";
import { AuthDialog, type AuthMode } from "@/components/auth/AuthDialog";
import { CheckoutDialog } from "@/components/cart/CheckoutDialog";
import { useAuth } from "@/lib/auth-store";

export function CartSheet() {
  const items = useCart();
  const products = usePublicShopStore((state) => state.products);
  const { t } = useI18n();
  const authUser = useAuth();

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");

  useEffect(() => {
    if (products.length) {
      cartStore.hydrateFromProducts(products);
    }
  }, [products]);

  const count = cartCount(items);
  const subtotal = cartSubtotal(items);
  const cartReady =
    items.length > 0 &&
    items.every((item) => item.isCustom || (item.productId && item.productVariantId));

  const addCustomItem = () => {
    const title = customItemName.trim();
    const priceText = customItemPrice.trim();
    const price = Number(priceText);

    if (!title) {
      toast.error("Enter an item name");
      return;
    }
    if (!priceText || !Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid item price");
      return;
    }

    cartStore.add({
      id: "custom:" + crypto.randomUUID(),
      title,
      price,
      unit: "unit",
      emoji: "🧾",
      isCustom: true,
    });
    setCustomItemName("");
    setCustomItemPrice("");
    toast.success(title + " added to cart");
  };

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

        <div className="mb-3 rounded-xl border border-border bg-muted/20 p-3">
          <div className="mb-3">
            <p className="text-sm font-semibold">Add custom item</p>
            <p className="text-xs text-muted-foreground">
              Add an item that is not in the catalogue with its own price.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
            <Input
              value={customItemName}
              onChange={(event) => setCustomItemName(event.target.value)}
              placeholder="Item name"
              aria-label="Custom item name"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={customItemPrice}
              onChange={(event) => setCustomItemPrice(event.target.value)}
              placeholder="Price"
              aria-label="Custom item price"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full rounded-lg"
            onClick={addCustomItem}
          >
            Add item
          </Button>
        </div>

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
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      {item.isCustom ? (
                        <Badge variant="secondary" className="shrink-0 rounded-full px-2 py-0.5 text-[10px]">
                          Custom
                        </Badge>
                      ) : null}
                    </div>
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
                disabled={!cartReady}
                onClick={() => {
                  if (!authUser) {
                    setAuthMode("register");
                    setAuthOpen(true);
                    return;
                  }
                  setCheckoutOpen(true);
                }}
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

        <AuthDialog
          open={authOpen}
          onOpenChange={setAuthOpen}
          mode={authMode}
          onModeChange={setAuthMode}
        />
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          items={items}
          subtotal={subtotal}
        />
      </SheetContent>
    </Sheet>
  );
}
