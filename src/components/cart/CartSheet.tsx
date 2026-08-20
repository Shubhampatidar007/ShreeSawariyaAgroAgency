import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, MapPin, Minus, Phone, Plus, ShoppingCart, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cartCount, cartStore, cartSubtotal, useCart } from "@/lib/cart-store";
import { placeCodOrder } from "@/lib/cod-checkout";
import { formatCurrency } from "@/lib/shop-store";
import { useI18n } from "@/lib/i18n";

const initialForm = {
  customerName: "",
  mobile: "",
  village: "",
  address: "",
  pincode: "",
  remarks: "",
};

export function CartSheet() {
  const items = useCart();
  const { t } = useI18n();
  const count = cartCount(items);
  const subtotal = cartSubtotal(items);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openCheckout = () => {
    if (!items.length) return;
    setOrderCode(null);
    setCheckoutOpen(true);
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!items.length) return;

    setPlacing(true);
    try {
      const result = await placeCodOrder({
        customerName: form.customerName,
        mobile: form.mobile,
        village: form.village,
        address: form.address,
        pincode: form.pincode,
        remarks: form.remarks,
        items: items.map((item) => ({ id: item.id, qty: item.qty })),
      });

      cartStore.clear();
      setOrderCode(result.orderCode);
      setForm(initialForm);
      toast.success("Order placed successfully", { description: result.orderCode });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to place the order";
      toast.error("Could not place order", { description: message });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <>
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
                  <span className="font-display text-lg font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <Button className="w-full rounded-full" onClick={openCheckout}>
                  Proceed to COD checkout
                </Button>
                <Button variant="ghost" className="w-full rounded-full" onClick={() => cartStore.clear()}>
                  {t("cart.clear", "Clear cart")}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {orderCode ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto size-14 text-primary" />
              <DialogTitle className="mt-4 text-2xl">Order confirmed</DialogTitle>
              <DialogDescription className="mt-2">
                Your Cash on Delivery order has been received.
              </DialogDescription>
              <div className="mx-auto mt-5 max-w-xs rounded-2xl border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Order number</p>
                <p className="mt-1 font-mono text-lg font-semibold">{orderCode}</p>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Keep this order number for delivery support. Payment is collected when your order arrives.
              </p>
              <Button className="mt-6 w-full rounded-full" onClick={() => setCheckoutOpen(false)}>
                Continue shopping
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Cash on Delivery</DialogTitle>
                <DialogDescription>
                  Enter your delivery details. You pay the exact order total when the parcel is delivered.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={submitOrder} className="mt-2 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="cod-name">Full name</Label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Input id="cod-name" required className="pl-9" value={form.customerName} onChange={(e) => updateField("customerName", e.target.value)} placeholder="Your name" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cod-mobile">Mobile number</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Input id="cod-mobile" required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} className="pl-9" value={form.mobile} onChange={(e) => updateField("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10 digit number" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cod-pincode">Pincode</Label>
                    <Input id="cod-pincode" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={form.pincode} onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6 digit pincode" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="cod-village">Village / town</Label>
                    <Input id="cod-village" value={form.village} onChange={(e) => updateField("village", e.target.value)} placeholder="Village, town or city" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="cod-address">Complete delivery address</Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Textarea id="cod-address" required className="min-h-24 pl-9" value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="House/shop number, street, landmark..." />
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="cod-remarks">Delivery note (optional)</Label>
                    <Input id="cod-remarks" value={form.remarks} onChange={(e) => updateField("remarks", e.target.value)} placeholder="Any useful instruction for delivery" />
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-medium">Pay on delivery</span>
                    <span className="font-display text-xl font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                </div>

                <Button type="submit" disabled={placing} className="w-full rounded-full">
                  {placing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {placing ? "Placing order..." : `Place COD order · ${formatCurrency(subtotal)}`}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  No online payment is taken. The server validates stock and delivery details before creating the order.
                </p>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
