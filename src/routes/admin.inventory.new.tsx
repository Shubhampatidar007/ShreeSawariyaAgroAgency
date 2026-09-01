import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/admin/inventory/new")({
  head: () => ({
    meta: [
      { title: "Add Stock Entry — Admin" },
      { name: "description", content: "Record supplier stock with quantity and purchase price." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InventoryEntryPage,
});

type VariantDraft = {
  id: string;
  quantity: string;
  unit: string;
  price: string;
};

const createVariantDraft = (overrides: Partial<VariantDraft> = {}): VariantDraft => ({
  id: crypto.randomUUID(),
  quantity: "",
  unit: "bags",
  price: "",
  ...overrides,
});

function InventoryEntryPage() {
  const inventoryItems = useShopStore((s) => s.inventory);
  const suppliers = useShopStore((s) => s.suppliers);
  const navigate = useNavigate();

  const [entryDataLoading, setEntryDataLoading] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [productName, setProductName] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([createVariantDraft()]);
  const [advancePaid, setAdvancePaid] = useState("");
  const [advanceMethod, setAdvanceMethod] = useState<"cash" | "upi" | "bank" | "cheque">("cash");
  const [minStock, setMinStock] = useState("10");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ company: "", name: "", mobile: "" });
  const [submitting, setSubmitting] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);

  useEffect(() => {
    let active = true;
    void shopStore.reload()
      .catch((error) => {
        console.error("Inventory entry data load failed:", error);
        toast.error("Failed to load suppliers and inventory. Please try again.");
      })
      .finally(() => {
        if (active) setEntryDataLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalPrice = useMemo(
    () => variants.reduce((sum, variant) => sum + (Number(variant.quantity) || 0) * (Number(variant.price) || 0), 0),
    [variants],
  );

  const selectedItem = inventoryItems.find((item) => item.id === selectedInventoryId) ?? null;

  const updateVariant = (id: string, patch: Partial<VariantDraft>) => {
    setVariants((current) => current.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)));
  };

  const addVariant = () => setVariants((current) => [...current, createVariantDraft()]);

  const removeVariant = (id: string) => {
    setVariants((current) => (current.length === 1 ? current : current.filter((variant) => variant.id !== id)));
  };

  const resetVariants = () => setVariants([createVariantDraft()]);

  const selectExistingInventory = (item: (typeof inventoryItems)[number]) => {
    setSelectedInventoryId(item.id);
    setProductName(item.productName);
    setProductSearch(item.productName);
    setSupplierId(item.supplierId);
    setVariants([
      createVariantDraft({
        quantity: "",
        unit: item.unit,
        price: String(item.purchasePrice),
      }),
    ]);
    setMinStock(String(item.minStockLevel));
    setAdvancePaid("");
  };

  const clearSelectedInventory = () => {
    setSelectedInventoryId("");
    setProductSearch("");
    setProductName("");
    setSupplierId("");
    resetVariants();
    setMinStock("10");
    setAdvancePaid("");
  };

  const submit = async () => {
    if (submitting) return;

    const supplier = suppliers.find((item) => item.id === supplierId);
    const cleanedVariants = variants.map((variant) => ({
      ...variant,
      quantity: Number(variant.quantity),
      price: Number(variant.price),
      unit: variant.unit.trim(),
    }));

    if (!supplier || !productName.trim()) {
      toast.error("Fill supplier and product name");
      return;
    }

    if (cleanedVariants.some((variant) => variant.quantity <= 0 || !variant.unit || variant.price < 0)) {
      toast.error("Fill a valid quantity, unit and purchase price for every variant");
      return;
    }

    const advance = Math.max(Number(advancePaid) || 0, 0);
    if (advance > totalPrice) {
      toast.error("Advance paid cannot exceed the total purchase value");
      return;
    }

    setSubmitting(true);

    try {
      let remainingAdvance = advance;
      for (const variant of cleanedVariants) {
        const variantTotal = variant.quantity * variant.price;
        const variantAdvance = Math.min(remainingAdvance, variantTotal);

        await shopStore.addInventoryItem({
          productName: productName.trim(),
          supplierId: supplier.id,
          supplierName: supplier.company,
          quantity: variant.quantity,
          unit: variant.unit,
          purchasePrice: variant.price,
          advancePaid: variantAdvance,
          advanceMethod,
          minStockLevel: Number(minStock) || 10,
          lastUpdated: new Date().toISOString().slice(0, 10),
        });

        remainingAdvance -= variantAdvance;
      }

      toast.success(
        cleanedVariants.length === 1
          ? selectedInventoryId
            ? "Stock added to existing product"
            : "Stock entry recorded"
          : `${cleanedVariants.length} product variants recorded`,
      );
      navigate({ to: "/admin/inventory" });
    } catch (error) {
      console.error("Inventory entry save failed:", error);
      toast.error("Failed to save entry. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Inventory", to: "/admin/inventory" },
          { label: "New entry" },
        ]}
        eyebrow="Inventory"
        title="Add stock entry"
        description="Add one product with one or more quantity variants and their purchase prices."
      />

      {entryDataLoading ? (
        <Card className="max-w-3xl shadow-soft">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-7 animate-spin" aria-hidden="true" />
            <p className="text-sm">Loading suppliers and inventory…</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-3xl shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Stock details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Supplier</Label>
              <div className="flex gap-2">
                <Select
                  value={supplierId}
                  disabled={Boolean(selectedInventoryId)}
                  onValueChange={(value) => {
                    setSupplierId(value);
                    if (selectedInventoryId) setSelectedInventoryId("");
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" disabled={Boolean(selectedInventoryId)}>
                      New supplier
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add supplier</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Input
                        placeholder="Company name"
                        value={newSupplier.company}
                        onChange={(e) => setNewSupplier({ ...newSupplier, company: e.target.value })}
                      />
                      <Input
                        placeholder="Contact person"
                        value={newSupplier.name}
                        onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      />
                      <Input
                        placeholder="Mobile"
                        value={newSupplier.mobile}
                        onChange={(e) => setNewSupplier({ ...newSupplier, mobile: e.target.value })}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        disabled={savingSupplier}
                        onClick={async () => {
                          if (savingSupplier) return;
                          if (!newSupplier.company) {
                            toast.error("Company name is required");
                            return;
                          }
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
                            toast.success("Supplier added — continue the stock entry");
                          } catch (error) {
                            console.error("Supplier creation failed:", error);
                            toast.error("Failed to add supplier. Please try again.");
                          } finally {
                            setSavingSupplier(false);
                          }
                        }}
                      >
                        {savingSupplier ? "Saving…" : "Save supplier"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Product</Label>
              <Input
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setSelectedInventoryId("");
                  setProductName(e.target.value);
                  if (!selectedInventoryId) resetVariants();
                }}
                placeholder="Search existing product or enter new product name"
              />

              {productSearch.trim() && (
                <div className="rounded-md border bg-background shadow-sm">
                  {inventoryItems
                    .filter(
                      (item) =>
                        item.quantity > 0 &&
                        item.productName.toLowerCase().includes(productSearch.trim().toLowerCase()),
                    )
                    .slice(0, 8)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex w-full items-center justify-between border-b px-3 py-3 text-left last:border-b-0 hover:bg-muted"
                        onClick={() => selectExistingInventory(item)}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">Supplier: {item.supplierName}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock: {item.quantity} {item.unit}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold">{formatCurrency(item.purchasePrice)}</p>
                          <p className="text-xs text-muted-foreground">per {item.unit}</p>
                        </div>
                      </button>
                    ))}

                  {inventoryItems.filter(
                    (item) =>
                      item.quantity > 0 &&
                      item.productName.toLowerCase().includes(productSearch.trim().toLowerCase()),
                  ).length === 0 && (
                    <div className="px-3 py-3 text-sm text-muted-foreground">
                      No existing product found. You can add it as a new product.
                    </div>
                  )}
                </div>
              )}

              {selectedItem ? (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Existing inventory selected</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Current stock: {selectedItem.quantity} {selectedItem.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supplier: {selectedItem.supplierName} · Purchase price: {formatCurrency(selectedItem.purchasePrice)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Enter only the additional quantity. The saved entry will add that quantity to current stock.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={clearSelectedInventory}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Product variants</Label>
                  <p className="text-xs text-muted-foreground">Add separate stock/price variants under the same product.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  + Add variant
                </Button>
              </div>

              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div key={variant.id} className="rounded-lg border p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium">Variant {index + 1}</p>
                      {variants.length > 1 && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => removeVariant(variant.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Quantity / stock</Label>
                        <Input
                          value={variant.quantity}
                          onChange={(e) => updateVariant(variant.id, { quantity: e.target.value })}
                          inputMode="decimal"
                          placeholder="500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit / size</Label>
                        <Input
                          value={variant.unit}
                          onChange={(e) => updateVariant(variant.id, { unit: e.target.value })}
                          placeholder="ml / L / bags"
                          disabled={Boolean(selectedInventoryId)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Purchase price (per unit)</Label>
                        <Input
                          value={variant.price}
                          onChange={(e) => updateVariant(variant.id, { price: e.target.value })}
                          inputMode="decimal"
                          placeholder="250"
                          disabled={Boolean(selectedInventoryId)}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-right text-xs text-muted-foreground">
                      Variant total: {formatCurrency((Number(variant.quantity) || 0) * (Number(variant.price) || 0))}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Advance paid to supplier</Label>
              <Input
                value={advancePaid}
                onChange={(e) => setAdvancePaid(e.target.value)}
                inputMode="decimal"
                min="0"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Advance payment method</Label>
              <Select
                value={advanceMethod}
                onValueChange={(value) => setAdvanceMethod(value as "cash" | "upi" | "bank" | "cheque")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Minimum stock level</Label>
              <Input
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                inputMode="numeric"
                placeholder="10"
                disabled={Boolean(selectedInventoryId)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Total purchase value</Label>
                <div className="rounded-md border bg-muted/50 px-3 py-2">
                  {formatCurrency(totalPrice)}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Advance paid</Label>
                <div className="rounded-md border bg-muted/50 px-3 py-2">
                  {formatCurrency(Number(advancePaid) || 0)}
                </div>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Total after advance paid</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 font-semibold">
                {formatCurrency(Math.max(0, totalPrice - (Number(advancePaid) || 0)))}
              </div>
            </div>

            <div className="flex gap-2 sm:col-span-2">
              <Button className="rounded-full" onClick={submit} disabled={submitting}>
                {submitting ? "Saving…" : "Save entry"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => navigate({ to: "/admin/inventory" })}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
