import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/shop-store";
import { cartStore, type CartItem } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import paymentQr from "@/assets/payment-qr.svg";

type CheckoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  subtotal: number;
};

export function CheckoutDialog({ open, onOpenChange, items, subtotal }: CheckoutDialogProps) {
  const user = useAuth();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [village, setVillage] = useState("");
  const [address, setAddress] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name);
    setMobile(user.mobile ?? "");
    setVillage(user.village ?? "");
    setAddress("");
  }, [open, user]);

  const validateCheckout = () => {
    if (!items.length) return false;
    if (!name.trim() || !mobile.trim() || !address.trim()) {
      toast.error("Name, mobile and delivery address are required.");
      return false;
    }

    const missingVariant = items.find((item) => !item.productVariantId);
    if (missingVariant) {
      toast.error(`${missingVariant.title} is missing its product variant.`);
      return false;
    }

    return true;
  };

  const placeOrder = async () => {
    if (!validateCheckout()) return;

    setPlacing(true);
    try {
      const { data, error } = await supabase.rpc("create_customer_order" as any, {
        _items: items.map((item) => ({
          product_id: item.productId ?? null,
          product_variant_id: item.productVariantId,
          product: item.title,
          quantity: item.qty,
          unit: item.unit,
          rate: item.price,
        })),
        _customer_id: null,
        _customer_name: name.trim(),
        _mobile: mobile.trim(),
        _village: village.trim(),
        _delivery_address: address.trim(),
        _payment_method: "cash_on_delivery",
        _remarks: "Online storefront order",
      });

      if (error) throw error;

      const orderId = data ? String(data) : "";
      let notificationSent = false;
      let notificationError = "";

      if (orderId) {
        try {
          const { data: notification, error: notifyError } = await supabase.functions.invoke(
            "order-whatsapp-notification",
            { body: { orderId } },
          );

          if (notifyError) {
            notificationError = notifyError.message;
          } else if (!notification?.ok) {
            notificationError = notification?.error || "Admin WhatsApp notification failed.";
          } else {
            notificationSent = true;
          }
        } catch (error) {
          notificationError = error instanceof Error ? error.message : "Admin WhatsApp notification failed.";
        }
      }

      cartStore.clear();
      onOpenChange(false);
      toast.success(`Order placed successfully${orderId ? ` · ${orderId.slice(0, 8)}` : ""}.`);

      if (notificationSent) {
        toast.success("Admin WhatsApp notification sent.");
      } else if (notificationError) {
        toast.warning("Order was created, but the admin WhatsApp notification could not be sent.");
        console.error("Order WhatsApp notification failed:", notificationError);
      }

      setName("");
      setMobile("");
      setVillage("");
      setAddress("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to place order.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>
            Review your variant selections and provide delivery details. Payment is currently cash on delivery.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 rounded-xl border border-border p-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.unit} · Qty {item.qty} · {formatCurrency(item.price)}
                  </p>
                </div>
                <span className="shrink-0 font-semibold">{formatCurrency(item.price * item.qty)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="checkout-name">Name</Label>
              <Input id="checkout-name" value={name} disabled placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-mobile">Mobile</Label>
              <Input id="checkout-mobile" value={mobile} disabled placeholder="Mobile number" inputMode="tel" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkout-village">Village / City</Label>
            <Input id="checkout-village" value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Village or city" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkout-address">Delivery address</Label>
            <Textarea id="checkout-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House, street, landmark and other delivery details" rows={3} />
          </div>

          <div className="grid gap-4 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="mx-auto rounded-xl bg-white p-2 shadow-sm">
              <img src={paymentQr} alt="Demo UPI payment QR code" className="size-32 sm:size-36" />
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Shree Sanwariya Agro Agency</p>
              <p className="text-muted-foreground">
                Advance Payment Help To Deliver Fast Pakages
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Secure payment integration can be enabled later.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={placing}>
            Cancel
          </Button>
          <Button onClick={placeOrder} disabled={placing || !items.length}>
            {placing ? "Placing order…" : (
              <>
                <CheckCircle2 className="size-4" />
                Place order · {formatCurrency(subtotal)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
