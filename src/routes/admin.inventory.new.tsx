import { useState } from "react";
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

function InventoryEntryPage() {
  const inventoryItems = useShopStore((s) => s.inventory);

  const [productSearch, setProductSearch] = useState("");
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const navigate = useNavigate();
  const suppliers = useShopStore((s) => s.suppliers);
  const [supplierId, setSupplierId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("bags");
  const [price, setPrice] = useState("");
  const [advancePaid, setAdvancePaid] = useState("");
  const [advanceMethod, setAdvanceMethod] = useState<"cash" | "upi" | "bank" | "cheque">("cash");
  const [minStock, setMinStock] = useState("10");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ company: "", name: "", mobile: "" });
  const [submitting, setSubmitting] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);

  const totalPrice = (Number(quantity) || 0) * (Number(price) || 0);

  const submit = async () => {
    if (submitting) return;
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier || !productName || !quantity || !price) {
      toast.error("Fill supplier, product, quantity and purchase price");
      return;
    }
    setSubmitting(true);
    try {
      await shopStore.addInventoryItem({
        productName,
        supplierId: supplier.id,
        supplierName: supplier.company,
        quantity: Number(quantity),
        unit,
        purchasePrice: Number(price),
        advancePaid: Number(advancePaid) || 0,
        advanceMethod,
        minStockLevel: Number(minStock) || 10,
        lastUpdated: new Date().toISOString().slice(0, 10),
      });
      toast.success("Stock entry recorded");
      navigate({ to: "/admin/inventory" });
    } catch (err) {
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
        description="Keep it simple: supplier, product, quantity and purchase price."
      />

      <Card className="max-w-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Stock details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Supplier</Label>
            <div className="flex gap-2">
              <Select
                value={supplierId}
                onValueChange={(value) => {
                  setSupplierId(value);

                  if (selectedInventoryId) {
                    setSelectedInventoryId("");
                  }
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
                          setDialogOpen(false);
                          toast.success("Supplier added — continue the stock entry");
                        } catch (err) {
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
              }}
              placeholder="Search existing product or enter new product name"
            />

            {productSearch.trim() && (
              <div className="rounded-md border bg-background shadow-sm">
                {inventoryItems

               .filter(
  (item) =>
    item.quantity > 0 &&
    item.productName.toLowerCase().includes(productSearch.toLowerCase()),
)
                  .slice(0, 8)
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full items-center justify-between border-b px-3 py-3 text-left last:border-b-0 hover:bg-muted"
                      onClick={() => {
                        setSelectedInventoryId(item.id);
                        setProductName(item.productName);
                        setProductSearch(item.productName);
                        setSupplierId(item.supplierId);
                        setUnit(item.unit);
                        setPrice(String(item.purchasePrice));
                      }}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.productName}</p>

                        <p className="text-xs text-muted-foreground">
                          Supplier: {item.supplierName}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Stock: {item.quantity} {item.unit}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">
                          {formatCurrency(item.purchasePrice)}
                        </p>

                        <p className="text-xs text-muted-foreground">per {item.unit}</p>
                      </div>
                    </button>
                  ))}

            {inventoryItems.filter(
  (item) =>
    item.quantity > 0 &&
    item.productName.toLowerCase().includes(productSearch.toLowerCase()),
).length === 0 && (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    No existing product found. You can add it as a new product.
                  </div>
                )}
              </div>
            )}

            {selectedInventoryId &&
              (() => {
                const selectedItem = inventoryItems.find((item) => item.id === selectedInventoryId);

                if (!selectedItem) return null;

                const priceChanged = Number(price) !== Number(selectedItem.purchasePrice);

                const supplierChanged = supplierId !== selectedItem.supplierId;

                const unitChanged =
                  unit.trim().toLowerCase() !== selectedItem.unit.trim().toLowerCase();

                const productChanged =
                  productName.trim().toLowerCase() !==
                  selectedItem.productName.trim().toLowerCase();

                const willCreateNewEntry =
                  priceChanged || supplierChanged || unitChanged || productChanged;
                return (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Existing inventory selected</p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Current stock: {selectedItem.quantity} {selectedItem.unit}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Current purchase price: {formatCurrency(selectedItem.purchasePrice)}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Supplier: {selectedItem.supplierName}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setSelectedInventoryId("");
                          setProductSearch("");
                          setProductName("");
                        }}
                      >
                        Clear
                      </button>
                    </div>

                    {willCreateNewEntry ? (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium text-amber-600">
                          A new inventory entry will be created.
                        </p>

                        {priceChanged && (
                          <p className="text-xs text-muted-foreground">
                            • Purchase price is different
                          </p>
                        )}

                        {supplierChanged && (
                          <p className="text-xs text-muted-foreground">• Supplier is different</p>
                        )}

                        {unitChanged && (
                          <p className="text-xs text-muted-foreground">• Unit is different</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Same product, supplier, unit and purchase price. New quantity will be added
                        to this existing inventory.
                      </p>
                    )}
                  </div>
                );
              })()}
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="numeric"
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bags" />
          </div>
          <div className="space-y-2">
            <Label>Purchase price (per unit)</Label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="numeric"
              placeholder="266"
            />
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

          <div className="space-y-2">
            <Label>Minimum stock level</Label>
            <Input
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              inputMode="numeric"
              placeholder="10"
            />
          </div>

          {/* New Totals Section */}
          <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
            {/* Total price */}
            <div className="space-y-2">
              <Label>Total price</Label>
              <div className="rounded-md border px-3 py-2 bg-muted/50">
                ₹{(Number(quantity || 0) * Number(price || 0)).toLocaleString("en-IN")}
              </div>
            </div>

            {/* Advance paid */}
            <div className="space-y-2">
              <Label>Advance paid</Label>
              <div className="rounded-md border px-3 py-2 bg-muted/50">
                ₹{Number(advancePaid || 0).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Remaining amount */}
          <div className="space-y-2 sm:col-span-2">
            <Label>Total after advance paid</Label>
            <div className="rounded-md border px-3 py-2 font-semibold bg-muted/50">
              ₹
              {Math.max(
                0,
                Number(quantity || 0) * Number(price || 0) - Number(advancePaid || 0),
              ).toLocaleString("en-IN")}
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
    </div>
  );
}
