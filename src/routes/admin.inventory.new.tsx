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
      { name: "description", content: "Record a supplier purchase with multiple products and variants." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InventoryEntryPage,
});

type VariantDraft = {
  quantity: string;
  unit: string;
  price: string;
};

type ItemDraft = {
  productSearch: string;
  selectedInventoryId: string;
  productName: string;
  variants: VariantDraft[];
};

const createVariantDraft = (overrides: Partial<VariantDraft> = {}): VariantDraft => ({
  quantity: "",
  unit: "bags",
  price: "",
  ...overrides,
});

const createItemDraft = (): ItemDraft => ({
  productSearch: "",
  selectedInventoryId: "",
  productName: "",
  variants: [createVariantDraft()],
});

function InventoryEntryPage() {
  const inventoryItems = useShopStore((s) => s.inventory);
  const suppliers = useShopStore((s) => s.suppliers);
  const navigate = useNavigate();

  const [entryDataLoading, setEntryDataLoading] = useState(true);
  const [items, setItems] = useState<ItemDraft[]>([createItemDraft()]);
  const [supplierId, setSupplierId] = useState("");
  const [advancePaid, setAdvancePaid] = useState("");
  const [advanceMethod, setAdvanceMethod] = useState<"cash" | "upi" | "bank" | "cheque">("cash");
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
    () =>
      items.reduce(
        (itemSum, item) =>
          itemSum +
          item.variants.reduce(
            (variantSum, variant) =>
              variantSum + (Number(variant.quantity) || 0) * (Number(variant.price) || 0),
            0,
          ),
        0,
      ),
    [items],
  );

  const updateItem = (itemIndex: number, patch: Partial<ItemDraft>) => {
    setItems((current) =>
      current.map((item, index) => (index === itemIndex ? { ...item, ...patch } : item)),
    );
  };

  const updateVariant = (itemIndex: number, variantIndex: number, patch: Partial<VariantDraft>) => {
    setItems((current) =>
      current.map((item, index) => {
        if (index !== itemIndex) return item;
        return {
          ...item,
          variants: item.variants.map((variant, currentVariantIndex) =>
            currentVariantIndex === variantIndex ? { ...variant, ...patch } : variant,
          ),
        };
      }),
    );
  };

  const addItem = () => setItems((current) => [...current, createItemDraft()]);

  const removeItem = (itemIndex: number) => {
    setItems((current) =>
      current.length === 1 ? current : current.filter((_, index) => index !== itemIndex),
    );
  };

  const addVariant = (itemIndex: number) => {
    setItems((current) =>
      current.map((item, index) =>
        index === itemIndex
          ? { ...item, variants: [...item.variants, createVariantDraft()] }
          : item,
      ),
    );
  };

  const removeVariant = (itemIndex: number, variantIndex: number) => {
    setItems((current) =>
      current.map((item, index) => {
        if (index !== itemIndex) return item;
        return {
          ...item,
          variants:
            item.variants.length === 1
              ? item.variants
              : item.variants.filter((_, currentVariantIndex) => currentVariantIndex !== variantIndex),
        };
      }),
    );
  };

  const selectExistingInventory = (itemIndex: number, inventoryItem: (typeof inventoryItems)[number]) => {
    updateItem(itemIndex, {
      selectedInventoryId: inventoryItem.id,
      productName: inventoryItem.productName,
      productSearch: inventoryItem.productName,
      variants: [
        createVariantDraft({
          unit: inventoryItem.unit,
          price: String(inventoryItem.purchasePrice),
        }),
      ],
    });
  };

  const clearItem = (itemIndex: number) => {
    updateItem(itemIndex, createItemDraft());
  };

  const submit = async () => {
    if (submitting) return;

    const supplier = suppliers.find((item) => item.id === supplierId);
    const cleanedItems = items.map((item) => ({
      ...item,
      productName: item.productName.trim(),
      variants: item.variants.map((variant) => ({
        quantity: Number(variant.quantity),
        unit: variant.unit.trim(),
        price: Number(variant.price),
      })),
    }));

    if (!supplier) {
      toast.error("Choose a supplier");
      return;
    }

    if (cleanedItems.some((item) => !item.productName)) {
      toast.error("Fill a product name for every item");
      return;
    }

    if (
      cleanedItems.some((item) =>
        item.variants.some(
          (variant) => variant.quantity <= 0 || !variant.unit || variant.price < 0,
        ),
      )
    ) {
      toast.error("Fill a valid quantity, unit and purchase price for every item");
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
      let savedVariants = 0;

      for (const item of cleanedItems) {
        for (const variant of item.variants) {
          const variantTotal = variant.quantity * variant.price;
          const variantAdvance = Math.min(remainingAdvance, variantTotal);

          await shopStore.addInventoryItem({
            productName: item.productName,
            supplierId: supplier.id,
            supplierName: supplier.company,
            quantity: variant.quantity,
            unit: variant.unit,
            purchasePrice: variant.price,
            advancePaid: variantAdvance,
            advanceMethod,
            minStockLevel: 10,
            lastUpdated: new Date().toISOString().slice(0, 10),
          });

          remainingAdvance -= variantAdvance;
          savedVariants += 1;
        }
      }

      toast.success(
        items.length === 1 && savedVariants === 1
          ? "Stock entry recorded"
          : `${items.length} products with ${savedVariants} variants recorded`,
      );
      navigate({ to: "/admin/inventory" });
    } catch (error) {
      console.error("Inventory purchase save failed:", error);
      toast.error("Failed to save purchase. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Inventory", to: "/admin/inventory" },
          { label: "New purchase" },
        ]}
        eyebrow="Inventory"
        title="Add stock purchase"
        description="Record multiple products from one supplier, with optional variants for each product."
      />

      {entryDataLoading ? (
        <Card className="max-w-5xl shadow-soft">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-7 animate-spin" aria-hidden="true" />
            <p className="text-sm">Loading suppliers and inventory…</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-5xl shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Purchase details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <div className="flex gap-2">
                <Select value={supplierId} onValueChange={setSupplierId}>
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
                    <Button type="button" variant="outline">
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
                            setNewSupplier({ company: "", name: "", mobile: "" });
                            setDialogOpen(false);
                            toast.success("Supplier added — continue the stock purchase");
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

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Items</Label>
                  <p className="text-xs text-muted-foreground">
                    Add different products from this supplier in one purchase.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  + Add item
                </Button>
              </div>

              <div className="space-y-4">
                {items.map((item, itemIndex) => {
                  const itemTotal = item.variants.reduce(
                    (sum, variant) =>
                      sum + (Number(variant.quantity) || 0) * (Number(variant.price) || 0),
                    0,
                  );
                  const matches = item.productSearch.trim()
                    ? inventoryItems
                        .filter(
                          (inventoryItem) =>
                            inventoryItem.quantity > 0 &&
                            inventoryItem.productName
                              .toLowerCase()
                              .includes(item.productSearch.trim().toLowerCase()),
                        )
                        .slice(0, 8)
                    : [];

                  return (
                    <div key={itemIndex} className="rounded-xl border p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Item {itemIndex + 1}</p>
                          <p className="text-xs text-muted-foreground">
                            Product, variants and purchase price
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-semibold">{formatCurrency(itemTotal)}</p>
                          {items.length > 1 && (
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => removeItem(itemIndex)}
                            >
                              Remove item
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Product</Label>
                        <Input
                          value={item.productSearch}
                          onChange={(e) =>
                            updateItem(itemIndex, {
                              productSearch: e.target.value,
                              selectedInventoryId: "",
                              productName: e.target.value,
                              variants: [createVariantDraft()],
                            })
                          }
                          placeholder="Search existing product or enter new product name"
                        />

                        {matches.length > 0 && (
                          <div className="rounded-md border bg-background shadow-sm">
                            {matches.map((inventoryItem) => (
                              <button
                                key={inventoryItem.id}
                                type="button"
                                className="flex w-full items-center justify-between border-b px-3 py-3 text-left last:border-b-0 hover:bg-muted"
                                onClick={() => selectExistingInventory(itemIndex, inventoryItem)}
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{inventoryItem.productName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Supplier: {inventoryItem.supplierName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Stock: {inventoryItem.quantity} {inventoryItem.unit}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-semibold">
                                    {formatCurrency(inventoryItem.purchasePrice)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    per {inventoryItem.unit}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {item.productSearch.trim() && matches.length === 0 && (
                          <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                            No existing product found. This will be recorded as a new product.
                          </div>
                        )}
                      </div>

                      {item.selectedInventoryId && (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                          <div>
                            <p className="text-sm font-medium">Existing inventory selected</p>
                            <p className="text-xs text-muted-foreground">
                              Enter the additional stock you are receiving below.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => clearItem(itemIndex)}
                          >
                            Clear
                          </button>
                        </div>
                      )}

                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <Label>Variants</Label>
                            <p className="text-xs text-muted-foreground">
                              Use multiple rows for different pack sizes, units or purchase rates.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addVariant(itemIndex)}
                          >
                            + Add variant
                          </Button>
                        </div>

                        {item.variants.map((variant, variantIndex) => (
                          <div key={variantIndex} className="rounded-lg border bg-muted/10 p-3">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-sm font-medium">Variant {variantIndex + 1}</p>
                              {item.variants.length > 1 && (
                                <button
                                  type="button"
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => removeVariant(itemIndex, variantIndex)}
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
                                  onChange={(e) =>
                                    updateVariant(itemIndex, variantIndex, {
                                      quantity: e.target.value,
                                    })
                                  }
                                  inputMode="decimal"
                                  placeholder="20"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Unit / size</Label>
                                <Input
                                  value={variant.unit}
                                  onChange={(e) =>
                                    updateVariant(itemIndex, variantIndex, { unit: e.target.value })
                                  }
                                  placeholder="bags / kg / L"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Purchase price</Label>
                                <Input
                                  value={variant.price}
                                  onChange={(e) =>
                                    updateVariant(itemIndex, variantIndex, { price: e.target.value })
                                  }
                                  inputMode="decimal"
                                  placeholder="1200"
                                />
                              </div>
                            </div>
                            <p className="mt-2 text-right text-xs text-muted-foreground">
                              Variant total:{" "}
                              {formatCurrency(
                                (Number(variant.quantity) || 0) * (Number(variant.price) || 0),
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
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
                  onValueChange={(value) =>
                    setAdvanceMethod(value as "cash" | "upi" | "bank" | "cheque")
                  }
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
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Items</p>
                  <p className="text-lg font-semibold">{items.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total purchase value</p>
                  <p className="text-lg font-semibold">{formatCurrency(totalPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining after advance</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(Math.max(0, totalPrice - (Number(advancePaid) || 0)))}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Minimum stock level is automatically set to 10 for every item.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button className="rounded-full" onClick={submit} disabled={submitting}>
                {submitting ? "Saving…" : "Save purchase"}
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
