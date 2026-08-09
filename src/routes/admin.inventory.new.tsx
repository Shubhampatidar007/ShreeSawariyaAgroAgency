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
  const navigate = useNavigate();
  const suppliers = useShopStore((s) => s.suppliers);
  const [supplierId, setSupplierId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("bags");
  const [price, setPrice] = useState("");
  const [minStock, setMinStock] = useState("10");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ company: "", name: "", mobile: "" });

  const totalPrice = (Number(quantity) || 0) * (Number(price) || 0);

  const submit = () => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier || !productName || !quantity || !price) {
      toast.error("Fill supplier, product, quantity and purchase price");
      return;
    }
    shopStore.addInventoryItem({
      productName,
      supplierId: supplier.id,
      supplierName: supplier.company,
      quantity: Number(quantity),
      unit,
      purchasePrice: Number(price),
      minStockLevel: Number(minStock) || 10,
      status: "inventory-only",
      lastUpdated: new Date().toISOString().slice(0, 10),
    });
    toast.success("Stock entry recorded");
    navigate({ to: "/admin/inventory" });
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
                      onClick={async () => {
                        if (!newSupplier.company) {
                          toast.error("Company name is required");
                          return;
                        }
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
                      }}
                    >
                      Save supplier
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Product name</Label>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" />
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" placeholder="100" />
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bags" />
          </div>
          <div className="space-y-2">
            <Label>Purchase price (per unit)</Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="266" />
          </div>
          <div className="space-y-2">
            <Label>Minimum stock level</Label>
            <Input value={minStock} onChange={(e) => setMinStock(e.target.value)} inputMode="numeric" placeholder="10" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Total price</Label>
            <div className="flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-semibold">
              {formatCurrency(totalPrice)}
            </div>
            <p className="text-xs text-muted-foreground">
              Quantity × unit price, updated as you type.
            </p>
          </div>

          <div className="flex gap-2 sm:col-span-2">
            <Button className="rounded-full" onClick={submit}>
              Save entry
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/admin/inventory" })}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}