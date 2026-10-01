import { useMemo, useState } from "react";
import { Loader2, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, shopStore, useShopStore } from "@/lib/shop-store";
import type { InventoryItem, ProductVariant, PublishedProduct } from "@/types/business";

type Props = {
  customer: { id: string; name: string; currentDue: number };
  trigger: React.ReactNode;
  onCreated?: (transactionId: string) => void;
};

type ProductOption = {
  key: string;
  inventoryId?: string;
  productId?: string;
  productVariantId?: string;
  title: string;
  category: string;
  emoji: string;
  inventoryUnit: string;
  quantityPerProduct?: number;
  purchasePrice: number;
  sellingPrice?: number;
  allowLooseSale: boolean;
  stock: number;
};

type ReturnItem = {
  key: string;
  search: string;
  selected: ProductOption | null;
  quantity: string;
  unit: string;
  loose: boolean;
  price: string;
};

const UNIT_DEFS: Record<string, { group: string; factor: number }> = {
  g: { group: "weight", factor: 1 },
  kg: { group: "weight", factor: 1000 },
  quintal: { group: "weight", factor: 100000 },
  tonne: { group: "weight", factor: 1000000 },
  ml: { group: "volume", factor: 1 },
  l: { group: "volume", factor: 1000 },
  piece: { group: "piece", factor: 1 },
  box: { group: "box", factor: 1 },
  packet: { group: "packet", factor: 1 },
  bag: { group: "bag", factor: 1 },
  unit: { group: "unit", factor: 1 },
};

const normalizeUnit = (value: string) => {
  const unit = value.trim().toLowerCase();
  if (/^\d+(?:\.\d+)?\s*kg(?:\b|$)|^kg(?:\b|$)/.test(unit)) return "kg";
  if (unit === "gm" || unit === "gram" || unit === "grams" || unit === "g") return "g";
  if (unit === "kg" || unit === "kgs" || unit === "kilo" || unit === "kilos" || unit === "kilogram" || unit === "kilograms") return "kg";
  if (unit === "q" || unit === "quintal" || unit === "quintals") return "quintal";
  if (unit === "t" || unit === "ton" || unit === "tons" || unit === "tonne" || unit === "tonnes") return "tonne";
  if (unit === "ml" || unit === "millilitre" || unit === "millilitres" || unit === "milliliter" || unit === "milliliters") return "ml";
  if (unit === "l" || unit === "lt" || unit === "ltr" || unit === "litre" || unit === "litres" || unit === "liter" || unit === "liters") return "l";
  if (unit === "pc" || unit === "pcs" || unit === "piece" || unit === "pieces") return "piece";
  if (unit === "box" || unit === "boxes") return "box";
  if (unit === "pack" || unit === "packs" || unit === "packet" || unit === "packets") return "packet";
  if (unit === "bag" || unit === "bags") return "bag";
  return unit || "unit";
};

const unitOptions = (inventoryUnit: string, loose: boolean) => {
  const normalized = normalizeUnit(inventoryUnit);
  if (!loose) return [normalized];
  const definition = UNIT_DEFS[normalized];
  if (!definition) return [normalized];
  return Object.entries(UNIT_DEFS)
    .filter(([, value]) => value.group === definition.group)
    .sort((a, b) => b[1].factor - a[1].factor)
    .map(([unit]) => unit);
};

const convertToInventoryUnit = (quantity: number, fromUnit: string, inventoryUnit: string) => {
  const from = UNIT_DEFS[normalizeUnit(fromUnit)];
  const to = UNIT_DEFS[normalizeUnit(inventoryUnit)];
  if (!from || !to || from.group !== to.group) return null;
  return quantity * from.factor / to.factor;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const emptyItem = (): ReturnItem => ({
  key: crypto.randomUUID(),
  search: "",
  selected: null,
  quantity: "",
  unit: "kg",
  loose: false,
  price: "",
});

const getProductForInventory = (inventory: InventoryItem, products: PublishedProduct[]) =>
  products.find((product) => product.inventoryId === inventory.id);

const getVariantForInventory = (inventory: InventoryItem, products: PublishedProduct[]) => {
  for (const product of products) {
    const variants = product.variants ?? [];
    const exact = variants.find((variant) => variant.inventoryId === inventory.id);
    if (exact) return exact;
  }
  return undefined;
};

const buildProductOptions = (inventory: InventoryItem[], products: PublishedProduct[]): ProductOption[] => {
  const rows = inventory.map((item) => {
    const product = getProductForInventory(item, products);
    const variant = getVariantForInventory(item, products);
    const packagePrice =
      item.sellingPrice ??
      variant?.discountPrice ??
      variant?.sellingPrice ??
      product?.discountPrice ??
      product?.sellingPrice;
    const quantityPerProduct = item.quantityPerProduct;
    const looseRate =
      item.allowLooseSale && quantityPerProduct && quantityPerProduct > 0 && packagePrice != null
        ? packagePrice / quantityPerProduct
        : packagePrice;

    return {
      key: variant?.id ?? item.id,
      inventoryId: item.id,
      productId: variant?.productId ?? product?.id,
      productVariantId: variant?.id ?? item.productVariantId,
      title: product?.title ?? item.productName,
      category: product?.category ?? item.supplierName ?? "Inventory",
      emoji: product?.emoji ?? "🌾",
      inventoryUnit: normalizeUnit(item.unit),
      quantityPerProduct,
      purchasePrice: item.purchasePrice,
      sellingPrice: looseRate,
      allowLooseSale: Boolean(item.allowLooseSale),
      stock: Math.max(item.quantity, 0),
    };
  });

  const inventoriedProductIds = new Set(rows.map((row) => row.productId).filter(Boolean));

  for (const product of products) {
    if (product.inventoryId || inventoriedProductIds.has(product.id)) continue;
    rows.push({
      key: "product:" + product.id,
      productId: product.id,
      title: product.title,
      category: product.category,
      emoji: product.emoji,
      inventoryUnit: "kg",
      purchasePrice: 0,
      sellingPrice: product.discountPrice ?? product.sellingPrice,
      allowLooseSale: false,
      stock: Math.max(product.stock, 0),
    });
  }

  return rows;
};

const optionText = (option: ProductOption) =>
  option.title + " " + option.category + " " + option.inventoryUnit;

export function KhataReturnDialog({ customer, trigger, onCreated }: Props) {
  const inventory = useShopStore((state) => state.inventory);
  const products = useShopStore((state) => state.products);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<ReturnItem[]>([emptyItem()]);

  const options = useMemo(() => buildProductOptions(inventory, products), [inventory, products]);

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const qty = Number(item.quantity);
        const price = Number(item.price);
        return sum + (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(price) ? price : 0);
      }, 0),
    [items],
  );

  const dueReduced = Math.min(total, Math.max(customer.currentDue, 0));
  const dueAfter = Math.max(customer.currentDue - total, 0);
  const advanceAdded = Math.max(total - Math.max(customer.currentDue, 0), 0);

  const reset = () => setItems([emptyItem()]);

  const updateItem = (key: string, patch: Partial<ReturnItem>) => {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  };

  const removeItem = (key: string) => {
    setItems((current) => {
      if (current.length === 1) return current;
      return current.filter((item) => item.key !== key);
    });
  };

  const selectProduct = (item: ReturnItem, option: ProductOption) => {
    const defaultUnit = option.inventoryUnit;
    const defaultPrice = option.sellingPrice ?? option.purchasePrice;
    updateItem(item.key, {
      selected: option,
      search: option.title,
      unit: defaultUnit,
      loose: option.allowLooseSale,
      price: defaultPrice > 0 ? String(roundMoney(defaultPrice)) : "",
    });
  };

  const addItem = () => setItems((current) => [...current, emptyItem()]);

  const handleSubmit = async () => {
    const payload = items.map((item, index) => {
      if (!item.selected) throw new Error("Select a product for item " + (index + 1));

      const quantity = Number(item.quantity);
      const price = Number(item.price);
      const unit = normalizeUnit(item.unit);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("Enter a valid quantity for " + item.selected.title);
      }
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Enter a valid return price for " + item.selected.title);
      }
      if (!item.loose && unit !== item.selected.inventoryUnit) {
        throw new Error("Unit must match inventory unit unless Loose / open is enabled");
      }
      if (item.loose && convertToInventoryUnit(1, unit, item.selected.inventoryUnit) == null) {
        throw new Error("Selected unit is not compatible with the inventory unit for " + item.selected.title);
      }

      return {
        inventoryId: item.selected.inventoryId,
        productId: item.selected.productId,
        productVariantId: item.selected.productVariantId,
        product: item.selected.title,
        quantity,
        unit,
        loose: item.loose,
        price,
      };
    });

    setSubmitting(true);
    try {
      const result = await shopStore.recordKhataReturn({ customerId: customer.id, items: payload });
      const message =
        result.advance_added > 0
          ? "Return of " + formatCurrency(result.total) + " recorded · " + formatCurrency(result.advance_added) + " added to advance"
          : "Return of " + formatCurrency(result.total) + " recorded · due reduced by " + formatCurrency(result.due_reduced);
      toast.success(message);
      onCreated?.(result.transaction_id);
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record product return");
    } finally {
      setSubmitting(false);
    }
  };

  const matchingOptions = (item: ReturnItem) => {
    const q = item.search.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options.filter((option) => optionText(option).toLowerCase().includes(q)).slice(0, 8);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-5xl overflow-visible">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="size-5" /> Return product
              </DialogTitle>
              <DialogDescription>
                {customer.name} · Return stock and apply the return value to this customer's khata.
              </DialogDescription>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={addItem}>
              <Plus className="size-3.5" /> Add item
            </Button>
          </div>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          {items.map((item, index) => {
            const matches = matchingOptions(item);
            const availableUnits = item.selected
              ? unitOptions(item.selected.inventoryUnit, item.loose)
              : ["kg", "l", "g"];

            return (
              <div key={item.key} className="rounded-xl border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Return item {index + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      Search an existing product, then enter the returned quantity and credit value.
                    </p>
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={"Remove return item " + (index + 1)}
                      onClick={() => removeItem(item.key)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Product name</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pr-9 pl-9"
                      placeholder="Search existing product or inventory item…"
                      value={item.search}
                      onChange={(event) => {
                        updateItem(item.key, {
                          search: event.target.value,
                          selected: item.selected?.title === event.target.value ? item.selected : null,
                          price: item.selected?.title === event.target.value ? item.price : "",
                        });
                      }}
                    />
                    {item.search && (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                        aria-label={"Clear product for item " + (index + 1)}
                        onClick={() =>
                          updateItem(item.key, {
                            search: "",
                            selected: null,
                            unit: "kg",
                            loose: false,
                            price: "",
                          })
                        }
                      >
                        <X className="size-4" />
                      </button>
                    )}
                    {item.selected == null && (
                      <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-background p-1 shadow-lg">
                        {matches.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            className="w-full rounded-md px-3 py-2 text-left hover:bg-muted"
                            onClick={() => selectProduct(item, option)}
                          >
                            <span className="block text-sm font-medium">{option.emoji} {option.title}</span>
                            <span className="block text-xs text-muted-foreground">
                              {option.category} · Stock {option.stock} {option.inventoryUnit}
                            </span>
                          </button>
                        ))}
                        {item.search.trim() && matches.length === 0 && (
                          <button
                            type="button"
                            className="w-full rounded-md px-3 py-2 text-left hover:bg-muted"
                            onClick={() =>
                              selectProduct(item, {
                                key: "new:" + item.search.trim().toLowerCase(),
                                title: item.search.trim(),
                                category: "New inventory item",
                                emoji: "📦",
                                inventoryUnit: "kg",
                                purchasePrice: 0,
                                sellingPrice: undefined,
                                allowLooseSale: false,
                                stock: 0,
                              })
                            }
                          >
                            <span className="block text-sm font-medium">
                              Use “{item.search.trim()}” as new inventory item
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              This will create the inventory record when you save the return.
                            </span>
                          </button>
                        )}
                        {!item.search.trim() && matches.length === 0 && (
                          <p className="px-3 py-2 text-sm text-muted-foreground">Type a product name to search.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                      placeholder="e.g. 350"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Unit</Label>
                    <Select
                      value={normalizeUnit(item.unit)}
                      onValueChange={(value) => updateItem(item.key, { unit: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                      <SelectContent>
                        {availableUnits.map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Price / selected unit</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={item.price}
                      onChange={(event) => updateItem(item.key, { price: event.target.value })}
                      placeholder="Return value per unit"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border px-3 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={item.loose}
                        onChange={(event) => {
                          const loose = event.target.checked;
                          const nextUnits = unitOptions(item.selected?.inventoryUnit ?? item.unit, loose);
                          updateItem(item.key, {
                            loose,
                            unit: nextUnits[0] ?? item.unit,
                          });
                        }}
                      />
                      Loose / open
                    </label>
                  </div>
                </div>

                {item.selected && (
                  <div className="mt-3 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Inventory stock after save: +{" "}
                    {(() => {
                      const qty = Number(item.quantity);
                      const converted = Number.isFinite(qty)
                        ? convertToInventoryUnit(qty, item.unit, item.selected.inventoryUnit)
                        : null;
                      return converted == null ? "—" : String(Math.round(converted * 1000000) / 1000000);
                    })()}{" "}
                    {item.selected.inventoryUnit}
                  </div>
                )}

                <div className="mt-3 text-right text-sm font-semibold">
                  Item return value: {formatCurrency((Number(item.quantity) || 0) * (Number(item.price) || 0))}
                </div>
              </div>
            );
          })}

          <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Total return value</p>
              <p className="mt-1 text-lg font-bold">{formatCurrency(total)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due before</p>
              <p className="mt-1 font-semibold">{formatCurrency(customer.currentDue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due after</p>
              <p className="mt-1 font-semibold">{formatCurrency(dueAfter)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Advance added</p>
              <p className="mt-1 font-semibold">{formatCurrency(advanceAdded)}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {dueReduced > 0
              ? formatCurrency(dueReduced) + " reduces the customer's due."
              : "The return value is added to the customer's advance."}
            {advanceAdded > 0 ? " Any amount above the due becomes advance." : ""}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" className="rounded-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            Save return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
