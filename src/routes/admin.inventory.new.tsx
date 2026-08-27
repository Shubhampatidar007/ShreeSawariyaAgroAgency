import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { formatCurrency, shopStore, useShopStore } from "@/lib/shop-store";
import { createSupplierSession } from "@/lib/supplier-session";

export const Route = createFileRoute("/admin/inventory/new")({
  head: () => ({
    meta: [
      { title: "Add Stock Session — Admin" },
      { name: "description", content: "Record one supplier session with one or more deliveries." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InventoryEntryPage,
});

type DeliveryDraft = {
  id: string;
  productName: string;
  quantity: string;
  unit: string;
  price: string;
};

const createDeliveryDraft = (): DeliveryDraft => ({
  id: crypto.randomUUID(),
  productName: "",
  quantity: "",
  unit: "bags",
  price: "",
});

function InventoryEntryPage() {
  const inventoryItems = useShopStore((s) => s.inventory);
  const suppliers = useShopStore((s) => s.suppliers);
  const navigate = useNavigate();
  const [supplierId, setSupplierId] = useState("");
  const [search, setSearch] = useState("");
  const [deliveries, setDeliveries] = useState<DeliveryDraft[]>([createDeliveryDraft()]);
  const [advancePaid, setAdvancePaid] = useState("");
  const [advanceMethod, setAdvanceMethod] = useState<"cash" | "upi" | "bank" | "cheque">("cash");
  const [minStock, setMinStock] = useState("10");
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ company: "", name: "", mobile: "" });
  const [submitting, setSubmitting] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);

  const totalPurchase = useMemo(
    () => deliveries.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0),
    [deliveries],
  );
  const advance = Math.max(Number(advancePaid) || 0, 0);
  const due = Math.max(totalPurchase - advance, 0);

  const updateDelivery = (id: string, patch: Partial<DeliveryDraft>) => {
    setDeliveries((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addDelivery = () => setDeliveries((current) => [...current, createDeliveryDraft()]);

  const removeDelivery = (id: string) => {
    setDeliveries((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  };

  const selectExistingProduct = (item: (typeof inventoryItems)[number]) => {
    const target = deliveries[0];
    updateDelivery(target.id, {
      productName: item.productName,
      unit: item.unit,
      price: String(item.purchasePrice),
    });
    setSearch(item.productName);
  };

  const submit = async () => {
    if (submitting) return;
    const supplier = suppliers.find((item) => item.id === supplierId);
    const cleaned = deliveries.map((item) => ({
      productName: item.productName.trim(),
      quantity: Number(item.quantity),
      unit: item.unit.trim(),
      purchasePrice: Number(item.price),
      minStockLevel: Number(minStock) || 10,
    }));

    if (!supplier) {
      toast.error("Choose a supplier first");
      return;
    }
    if (cleaned.some((item) => !item.productName || item.quantity <= 0 || !item.unit || item.purchasePrice < 0)) {
      toast.error("Complete every delivery with a valid product, quantity, unit and price");
      return;
    }
    if (advance > totalPurchase) {
      toast.error("Advance paid cannot exceed the session purchase value");
      return;
    }

    setSubmitting(true);
    try {
      const sessionId = await createSupplierSession({
        supplierId: supplier.id,
        deliveries: cleaned,
        advancePaid: advance,
        advanceMethod,
        notes,
      });
      toast.success(`${cleaned.length} delivery${cleaned.length === 1 ? "" : "ies"} saved in one session`);
      navigate({ to: "/admin/inventory" });
      console.info("Created supplier session", sessionId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save stock session");
    } finally {
      setSubmitting(false);
    }
  };

  const matchingProducts = search.trim()
    ? inventoryItems.filter((item) => item.quantity > 0 && item.productName.toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Inventory", to: "/admin/inventory" },
          { label: "New session" },
        ]}
        eyebrow="Inventory · Supplier session"
        title="Add stock session"
        description="Group every delivery received from one supplier into a single ledger session."
      />

      <Card className="max-w-4xl shadow-soft">
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Session details</CardTitle>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary" aria-label="Session behavior">
              One session · multiple deliveries
            </span>
          </div>
          <p className="text-sm text-muted-foreground">A session name is generated automatically as supplier_name_HHMM.</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="session-supplier">Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="session-supplier" aria-label="Choose supplier">
                  <SelectValue placeholder="Choose supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>{supplier.company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="self-end">+ New supplier</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add supplier</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input aria-label="Company name" placeholder="Company name" value={newSupplier.company} onChange={(e) => setNewSupplier({ ...newSupplier, company: e.target.value })} />
                  <Input aria-label="Contact person" placeholder="Contact person" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} />
                  <Input aria-label="Mobile number" placeholder="Mobile" value={newSupplier.mobile} onChange={(e) => setNewSupplier({ ...newSupplier, mobile: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button
                    disabled={savingSupplier}
                    onClick={async () => {
                      if (!newSupplier.company.trim()) return toast.error("Company name is required");
                      setSavingSupplier(true);
                      try {
                        const created = await shopStore.addSupplier({
                          name: newSupplier.name || newSupplier.company,
                          company: newSupplier.company,
                          mobile: newSupplier.mobile,
                          email: "",
                          gstin: "",
                          address: "",
                          productsSupplied: [],
                          totalPurchases: 0,
                          totalPaid: 0,
                          advance: 0,
                          dueBalance: 0,
                          lastOrder: new Date().toISOString().slice(0, 10),
                          status: "active",
                        });
                        setSupplierId(created.id);
                        setDialogOpen(false);
                        toast.success("Supplier added");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to add supplier");
                      } finally {
                        setSavingSupplier(false);
                      }
                    }}
                  >{savingSupplier ? "Saving…" : "Save supplier"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <section aria-labelledby="delivery-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="delivery-heading" className="text-sm font-semibold">Deliveries in this session</h2>
                <p className="text-xs text-muted-foreground">Each delivery stays separate while sharing one session ID.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addDelivery}>+ Add delivery</Button>
            </div>

            <div className="space-y-3">
              {deliveries.map((delivery, index) => {
                const lineTotal = (Number(delivery.quantity) || 0) * (Number(delivery.price) || 0);
                return (
                  <article key={delivery.id} className="rounded-xl border bg-card p-4" aria-label={`Delivery ${index + 1}`}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">Delivery {index + 1}</span>
                        <span className="text-xs text-muted-foreground">{formatCurrency(lineTotal)}</span>
                      </div>
                      {deliveries.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeDelivery(delivery.id)}>Remove</Button>}
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1.6fr_0.8fr_0.9fr_1fr]">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`product-${delivery.id}`}>Product</Label>
                        <Input
                          id={`product-${delivery.id}`}
                          aria-label={`Delivery ${index + 1} product`}
                          value={delivery.productName}
                          onChange={(e) => updateDelivery(delivery.id, { productName: e.target.value })}
                          onFocus={() => setSearch(delivery.productName)}
                          placeholder="Search or enter product"
                        />
                        {index === 0 && search.trim() && matchingProducts.length > 0 && (
                          <div className="rounded-lg border bg-background shadow-sm" role="listbox" aria-label="Existing products">
                            {matchingProducts.map((item) => (
                              <button key={item.id} type="button" className="flex w-full items-center justify-between border-b px-3 py-2 text-left last:border-0 hover:bg-muted" onClick={() => selectExistingProduct(item)}>
                                <span className="truncate text-sm font-medium">{item.productName}</span>
                                <span className="text-xs text-muted-foreground">{item.quantity} {item.unit} · {formatCurrency(item.purchasePrice)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${delivery.id}`}>Quantity</Label>
                        <Input id={`quantity-${delivery.id}`} aria-label={`Delivery ${index + 1} quantity`} value={delivery.quantity} onChange={(e) => updateDelivery(delivery.id, { quantity: e.target.value })} inputMode="decimal" placeholder="500" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`unit-${delivery.id}`}>Unit / size</Label>
                        <Input id={`unit-${delivery.id}`} aria-label={`Delivery ${index + 1} unit`} value={delivery.unit} onChange={(e) => updateDelivery(delivery.id, { unit: e.target.value })} placeholder="bags / 25 kg" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`price-${delivery.id}`}>Purchase price / unit</Label>
                        <Input id={`price-${delivery.id}`} aria-label={`Delivery ${index + 1} purchase price`} value={delivery.price} onChange={(e) => updateDelivery(delivery.id, { price: e.target.value })} inputMode="decimal" placeholder="250" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="advance-paid">Advance paid to supplier</Label>
              <Input id="advance-paid" aria-label="Advance paid" value={advancePaid} onChange={(e) => setAdvancePaid(e.target.value)} inputMode="decimal" min="0" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Advance payment method</Label>
              <Select value={advanceMethod} onValueChange={(value) => setAdvanceMethod(value as typeof advanceMethod)}>
                <SelectTrigger aria-label="Advance payment method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-stock">Minimum stock level</Label>
              <Input id="min-stock" value={minStock} onChange={(e) => setMinStock(e.target.value)} inputMode="numeric" placeholder="10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-notes">Session notes</Label>
              <Input id="session-notes" aria-label="Session notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Invoice no., vehicle, special note…" />
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-3" aria-label="Session totals">
            <div><p className="text-xs text-muted-foreground">Deliveries</p><p className="text-lg font-semibold">{deliveries.length}</p></div>
            <div><p className="text-xs text-muted-foreground">Total purchase</p><p className="text-lg font-semibold">{formatCurrency(totalPurchase)}</p></div>
            <div><p className="text-xs text-muted-foreground">Due after advance</p><p className="text-lg font-semibold">{formatCurrency(due)}</p></div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="rounded-full" onClick={submit} disabled={submitting}>{submitting ? "Saving session…" : "Save session"}</Button>
            <Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/admin/inventory" })} disabled={submitting}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
