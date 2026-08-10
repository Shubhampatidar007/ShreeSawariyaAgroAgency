import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Loader2, Plus, ShoppingCart, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  shopStore,
  useShopStore,
} from "@/lib/shop-store";
import type { PaymentMethod } from "@/types/business";

type CartItem = {
  key: string;
  inventoryId?: string;
  productId?: string;
  product: string;
  unit: string;
  rate: number;
  quantity: number;
  maxStock?: number;
};

type Props = {
  /** Preselect a customer (from the Khata / customer detail page). Omit to search or create one. */
  customer?: { id: string; name: string };
  trigger: ReactNode;
  onCreated?: (transactionId: string) => void;
};

export function KhataSaleDialog({
  customer,
  trigger,
  onCreated,
}: Props) {
  const customers = useShopStore((s) => s.customers);
  const products = useShopStore((s) => s.products);
  const inventory = useShopStore((s) => s.inventory);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // customer selection
  const [customerMode, setCustomerMode] =
    useState<"select" | "new">("select");
  const [selectedCustomerId, setSelectedCustomerId] =
    useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    mobile: "",
    village: "",
    address: "",
  });

  // cart
  const [items, setItems] = useState<CartItem[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [customRate, setCustomRate] = useState("");

  // payment
  const [paid, setPaid] = useState("0");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [entryDate, setEntryDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [remarks, setRemarks] = useState("");

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.rate, 0),
    [items],
  );

  const paidNum = Number(paid) || 0;
  const due = Math.max(total - paidNum, 0);

  /*
   * Customer search
   *
   * Removes duplicate records with the same ID.
   * Search still works using either customer name or mobile.
   */
  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();

    const uniqueCustomers = Array.from(
      new Map(customers.map((c) => [c.id, c])).values(),
    );

    if (!q) {
      return uniqueCustomers.slice(0, 8);
    }

    return uniqueCustomers
      .filter((c) => {
        const name = c.name.toLowerCase();
        const mobile = c.mobile.toLowerCase();

        return name.includes(q) || mobile.includes(q);
      })
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        // Exact name match first
        if (aName === q && bName !== q) return -1;
        if (bName === q && aName !== q) return 1;

        // Name starting with search text next
        if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
        if (bName.startsWith(q) && !aName.startsWith(q)) return 1;

        return 0;
      })
      .slice(0, 8);
  }, [customers, customerQuery]);

  const selectedCustomer = useMemo(
    () =>
      customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  /*
   * Inventory-backed product search
   *
   * Uses inventory directly instead of depending only on published
   * products. If a matching product exists, its title/category/emoji/
   * selling price are used. Otherwise inventory data is used.
   */
  const catalogOptions = useMemo(() => {
    const q = productQuery.trim().toLowerCase();

    return inventory
      .map((item) => {
        const product = products.find(
          (p) => p.inventoryId === item.id,
        );

        return {
          key: item.id,
          inventoryId: item.id,
          productId: product?.id,
          title: product?.title ?? item.productName,
          subtitle: product?.category ?? "Inventory",
          emoji: product?.emoji ?? "🌾",
          unit: item.unit,
          rate: product?.sellingPrice ?? item.purchasePrice,
          stock: item.quantity,
        };
      })
      .filter((option) => {
        if (!q) return true;

        return `${option.title} ${option.subtitle} ${option.unit} ${option.stock} ${option.rate}`
          .toLowerCase()
          .includes(q);
      })
      .slice(0, 8);
  }, [inventory, products, productQuery]);

  const reset = () => {
    setCustomerMode("select");
    setSelectedCustomerId(null);
    setCustomerQuery("");
    setNewCustomer({
      name: "",
      mobile: "",
      village: "",
      address: "",
    });

    setItems([]);
    setProductQuery("");
    setCustomName("");
    setCustomRate("");

    setPaid("0");
    setMethod("cash");
    setEntryDate(new Date().toISOString().slice(0, 10));
    setRemarks("");
  };

  const addProductToCart = (inventoryId: string) => {
    const inv = inventory.find((i) => i.id === inventoryId);
    if (!inv) return;

    const product = products.find(
      (p) => p.inventoryId === inv.id,
    );

    setItems((prev): CartItem[] => {
      const existing = prev.find(
        (i) =>
          i.inventoryId === inv.id ||
          (product?.id !== undefined &&
            i.productId === product.id),
      );

      if (existing) {
        return prev.map((i) =>
          i.key === existing.key
            ? {
                ...i,
                quantity: i.quantity + 1,
              }
            : i,
        );
      }

      const newItem: CartItem = {
        key: crypto.randomUUID(),
        inventoryId: inv.id,
        ...(product?.id
          ? { productId: product.id }
          : {}),
        product: product?.title ?? inv.productName,
        unit: inv.unit,
        rate:
          product?.sellingPrice ??
          inv.purchasePrice,
        quantity: 1,
        maxStock: inv.quantity,
      };

      return [...prev, newItem];
    });
  };

  const addCustomItem = () => {
    const rate = Number(customRate);

    if (!customName.trim()) {
      return toast.error("Enter an item name");
    }

    if (rate < 0 || Number.isNaN(rate)) {
      return toast.error("Enter a valid price");
    }

    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        product: customName.trim(),
        unit: "unit",
        rate,
        quantity: 1,
      },
    ]);

    setCustomName("");
    setCustomRate("");
  };

  const updateItem = (
    key: string,
    patch: Partial<CartItem>,
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, ...patch }
          : item,
      ),
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) =>
      prev.filter((item) => item.key !== key),
    );
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      return toast.error(
        "Add at least one product to the sale",
      );
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        return toast.error(
          `Enter a valid quantity for ${item.product}`,
        );
      }

      if (
        item.maxStock !== undefined &&
        item.quantity > item.maxStock
      ) {
        return toast.error(
          `Only ${item.maxStock} ${item.unit} of ${item.product} in stock`,
        );
      }
    }

    let customerId =
      customer?.id ??
      selectedCustomerId ??
      undefined;

    if (!customerId && customerMode === "new") {
      if (
        !newCustomer.name.trim() ||
        !newCustomer.mobile.trim()
      ) {
        return toast.error(
          "Enter the customer's name and mobile number",
        );
      }
    } else if (!customerId) {
      return toast.error(
        "Select or create a customer",
      );
    }

    if (paidNum < 0) {
      return toast.error(
        "Paid amount cannot be negative",
      );
    }

    if (paidNum > total) {
      return toast.error(
        "Paid amount cannot exceed the total",
      );
    }

    setSubmitting(true);

    try {
      if (!customerId) {
        const created =
          await shopStore.addCustomer({
            name: newCustomer.name.trim(),
            mobile: newCustomer.mobile.trim(),
            village: newCustomer.village.trim(),
            address: newCustomer.address.trim(),
            joinedOn: new Date()
              .toISOString()
              .slice(0, 10),
            creditLimit: 0,
            creditBalance: 0,
            totalPurchases: 0,
            totalPaid: 0,
            currentDue: 0,
            lastPurchase: "",
            status: "active",
          });

        customerId = created.id;
      }

      const txId =
        await shopStore.createKhataSale({
          customerId,
          items: items.map((item) => ({
            ...(item.productId
              ? { productId: item.productId }
              : {}),
            product: item.product,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
          })),
          paid: paidNum,
          method,
          date: entryDate,
          ...(remarks.trim()
            ? { remarks: remarks.trim() }
            : {}),
        });

      toast.success(
        paidNum >= total
          ? "Sale recorded — fully paid"
          : paidNum > 0
            ? "Sale recorded — partly paid"
            : "Sale recorded on credit (udhari)",
      );

      onCreated?.(txId);
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not record the sale",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);

        if (!next) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="size-5" />
            New khata sale
          </DialogTitle>

          <DialogDescription>
            {customer
              ? `Recording a sale for ${customer.name}`
              : "Select or create a customer, add products, then save."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!customer && (
            <div className="space-y-3 rounded-lg border p-3">
              {/* Customer mode buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    customerMode === "select"
                      ? "default"
                      : "outline"
                  }
                  className="rounded-full"
                  onClick={() => {
                    setCustomerMode("select");
                  }}
                >
                  Existing customer
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={
                    customerMode === "new"
                      ? "default"
                      : "outline"
                  }
                  className="rounded-full"
                  onClick={() => {
                    setCustomerMode("new");
                    setSelectedCustomerId(null);
                    setCustomerQuery("");
                  }}
                >
                  New customer
                </Button>
              </div>

              {/* Existing customer */}
              {customerMode === "select" ? (
                <div className="space-y-2">
                  {selectedCustomer ? (
                    /* Selected customer banner */
                    <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Selected customer
                        </p>

                        <p className="font-medium">
                          {selectedCustomer.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {selectedCustomer.mobile}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => {
                          setSelectedCustomerId(null);
                          setCustomerQuery("");
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    /* Customer search */
                    <>
                      <Input
                        placeholder="Search by name or mobile"
                        value={customerQuery}
                        onChange={(e) =>
                          setCustomerQuery(
                            e.target.value,
                          )
                        }
                      />

                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {filteredCustomers.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => {
                              setCustomerMode(
                                "select",
                              );
                              setSelectedCustomerId(
                                c.id,
                              );
                              setCustomerQuery(
                                c.name,
                              );
                            }}
                            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${
                              selectedCustomerId ===
                              c.id
                                ? "border border-primary bg-primary/5 font-medium"
                                : ""
                            }`}
                          >
                            <span>{c.name}</span>

                            <span className="text-muted-foreground">
                              {c.village ||
                                "Village not available"}
                            </span>
                          </button>
                        ))}

                        {filteredCustomers.length ===
                          0 && (
                          <p className="px-3 py-2 text-sm text-muted-foreground">
                            No customers found
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* New customer */
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Customer name"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer((v) => ({
                        ...v,
                        name: e.target.value,
                      }))
                    }
                  />

                  <Input
                    placeholder="Mobile number"
                    inputMode="numeric"
                    value={newCustomer.mobile}
                    onChange={(e) =>
                      setNewCustomer((v) => ({
                        ...v,
                        mobile: e.target.value,
                      }))
                    }
                  />

                  <Input
                    placeholder="Village"
                    value={newCustomer.village}
                    onChange={(e) =>
                      setNewCustomer((v) => ({
                        ...v,
                        village: e.target.value,
                      }))
                    }
                  />

                  <Input
                    placeholder="Address"
                    value={newCustomer.address}
                    onChange={(e) =>
                      setNewCustomer((v) => ({
                        ...v,
                        address: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* Products */}
          <div className="space-y-3">
            <Label>
              Add products from inventory
            </Label>

            <Input
              placeholder="Search inventory product, stock or price"
              value={productQuery}
              onChange={(e) =>
                setProductQuery(e.target.value)
              }
            />

            <div className="flex flex-wrap gap-2">
              {catalogOptions.map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() =>
                    addProductToCart(
                      option.inventoryId,
                    )
                  }
                >
                  {option.emoji} {option.title} ·{" "}
                  {formatCurrency(option.rate)} ·{" "}
                  {option.stock} {option.unit}
                </Button>
              ))}

              {catalogOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No matching inventory items
                </p>
              )}
            </div>

            {/* Custom item */}
           
          </div>

          {/* Cart */}
          {items.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-20">
                      Qty
                    </TableHead>
                    <TableHead className="w-24">
                      Rate
                    </TableHead>
                    <TableHead className="text-right">
                      Subtotal
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell className="font-medium">
                        {item.product}

                        <span className="ml-1 text-xs text-muted-foreground">
                          ({item.unit})
                        </span>
                      </TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 w-16"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.key, {
                              quantity:
                                Number(
                                  e.target.value,
                                ) || 0,
                            })
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 w-20"
                          value={item.rate}
                          onChange={(e) =>
                            updateItem(item.key, {
                              rate:
                                Number(
                                  e.target.value,
                                ) || 0,
                            })
                          }
                        />
                      </TableCell>

                      <TableCell className="text-right">
                        {formatCurrency(
                          item.quantity * item.rate,
                        )}
                      </TableCell>

                      <TableCell>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            removeItem(item.key)
                          }
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
 <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto]">
              <Input
                placeholder="Custom item name"
                value={customName}
                onChange={(e) =>
                  setCustomName(e.target.value)
                }
              />

              <Input
                className="w-32"
                type="number"
                min="0"
                placeholder="Price"
                value={customRate}
                onChange={(e) =>
                  setCustomRate(e.target.value)
                }
              />

              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="sm:col-span-3"
                onClick={addCustomItem}
              >
                <Plus className="size-4" />
                Add custom item
              </Button>
            </div>
          {/* Payment */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Amount paid now</Label>

              <Input
                type="number"
                min="0"
                value={paid}
                onChange={(e) =>
                  setPaid(e.target.value)
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Payment method</Label>

              <Select
                value={method}
                onValueChange={(v) =>
                  setMethod(v as PaymentMethod)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="cash">
                    Cash
                  </SelectItem>

                  <SelectItem value="upi">
                    UPI
                  </SelectItem>

                  <SelectItem value="bank">
                    Bank transfer
                  </SelectItem>

                  <SelectItem value="cheque">
                    Cheque
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Date</Label>

              <Input
                type="date"
                value={entryDate}
                onChange={(e) =>
                  setEntryDate(e.target.value)
                }
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>
                Remarks (optional)
              </Label>

              <Textarea
                rows={2}
                value={remarks}
                onChange={(e) =>
                  setRemarks(e.target.value)
                }
              />
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
            <span>
              Total:{" "}
              <strong>
                {formatCurrency(total)}
              </strong>
            </span>

            <span>
              Paid:{" "}
              <strong className="text-success">
                {formatCurrency(paidNum)}
              </strong>
            </span>

            <span>
              Due:{" "}
              <strong
                className={
                  due > 0
                    ? "text-warning"
                    : "text-success"
                }
              >
                {formatCurrency(due)}
              </strong>
            </span>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>

          <Button
            type="button"
            className="rounded-full"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Save sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}