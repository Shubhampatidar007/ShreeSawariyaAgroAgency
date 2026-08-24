import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, Loader2, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
import { formatCurrency, shopStore, useShopStore } from "@/lib/shop-store";
import type { PaymentMethod } from "@/types/business";

type CartItem = {
  key: string;
  inventoryId?: string;
  productId?: string;
  productVariantId?: string;
  product: string;
  unit: string;
  rate: number;
  quantity: number;
  maxStock?: number;
};

type Props = {
  /** Preselect a customer (from the Khata / customer detail page). Omit to search or create one. */
  customer?: {
    id: string;
    name: string;
    mobile?: string;
  };
  trigger: ReactNode;
  onCreated?: (transactionId: string) => void;
};

type ReceiptOption = "current" | "full" | "none";

const KHATA_RECEIPT_EDGE_FUNCTION =
  import.meta.env["VITE_KHATA_RECEIPT_EDGE_FUNCTION"] || "whatsapp-meta-messages";

async function sendKhataReceiptToEdgeFunction({
  receiptOption,
  customerId,
  transactionId,
  customer,
  items,
  total,
  paid,
  due,
  paymentMethod,
  saleDate,
}: {
  receiptOption: ReceiptOption;
  customerId: string;
  transactionId: string;
  customer: {
    id: string;
    name: string;
    mobile?: string;
  };
  items: CartItem[];
  total: number;
  paid: number;
  due: number;
  paymentMethod: PaymentMethod;
  saleDate: string;
}) {
  if (receiptOption === "none") {
    return {
      success: true,
      skipped: true,
    };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(`Could not get Supabase session: ${sessionError.message}`);
  }

  if (!session?.access_token) {
    throw new Error("You are not logged in. Please sign in again.");
  }

  const supabaseUrl = "https://cmfqlpcrnkswgxrszoog.supabase.co";

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${KHATA_RECEIPT_EDGE_FUNCTION}`;
  /*
   * Send only structured data.
   *
   * The Edge Function is responsible for:
   *
   * 1. Building the current receipt
   * 2. Querying purchase history for full receipt
   * 3. Calculating totals
   * 4. Sending WhatsApp through Meta
   */
  const response = await fetch(edgeFunctionUrl, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      apikey: "sb_publishable_4VzGDmax-6XyPaW1NomaNQ_kotGVa9i",

      Authorization: `Bearer ${session.access_token}`,
    },

    body: JSON.stringify({
      /*
       * This tells the existing Edge Function
       * to enter the new receipt code.
       */
      kind: "purchase-receipt",

      /*
       * current / full / none
       */
      receiptOption,

      /*
       * Required by the Edge Function to identify
       * the newly-created transaction.
       */
      transactionId,

      /*
       * Required for Sup—abase purchase-history query.
       */
      customerId,

      /*
       * Customer information.
       */
      customer: {
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile ?? "",
      },

      /*
       * Current sale information.
       */
      sale: {
        date: saleDate,

        items: items.map((item) => ({
          ...(item.inventoryId ? { inventoryId: item.inventoryId } : {}),
          ...(item.productId ? { productId: item.productId } : {}),
          ...(item.productVariantId ? { productVariantId: item.productVariantId } : {}),
          product: item.product,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
        })),
        total,

        paid,

        due,

        paymentMethod,
      },
    }),
  });

  /*
   * Read Edge Function response.
   */
  const responseText = await response.text();

  let result: unknown;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    result = responseText;
  }

  /*
   * Edge Function returned an error.
   */
  if (!response.ok) {
    const errorMessage =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof (
        result as {
          error?: unknown;
        }
      ).error === "string"
        ? (
            result as {
              error: string;
            }
          ).error
        : `Receipt Edge Function failed with status ${response.status}`;

    throw new Error(errorMessage);
  }

  /*
   * Successful response.
   */
  return result;
}

export function KhataSaleDialog({ customer, trigger, onCreated }: Props) {
  const customers = useShopStore((s) => s.customers);
  const products = useShopStore((s) => s.products);
  const inventory = useShopStore((s) => s.inventory);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // customer selection
  const [customerMode, setCustomerMode] = useState<"select" | "new">("select");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
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
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");

  // receipt choice option: default is 'current'
  const [receiptOption, setReceiptOption] = useState<"current" | "full" | "none">("current");

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.rate, 0),
    [items],
  );

  const paidNum = Number(paid) || 0;
  const due = Math.max(total - paidNum, 0);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();

    const uniqueCustomers = Array.from(new Map(customers.map((c) => [c.id, c])).values());

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

        if (aName === q && bName !== q) return -1;
        if (bName === q && aName !== q) return 1;

        if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
        if (bName.startsWith(q) && !aName.startsWith(q)) return 1;

        return 0;
      })
      .slice(0, 8);
  }, [customers, customerQuery]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const catalogOptions = useMemo(() => {
    const q = productQuery.trim().toLowerCase();

    return products
      .flatMap((product) =>
        (product.variants ?? []).map((variant) => ({
          key: variant.id,
          inventoryId: variant.inventoryId,
          productId: product.id,
          productVariantId: variant.id,
          title: product.title,
          subtitle: product.category ?? "Inventory",
          emoji: product.emoji ?? "🌾",
          unit: variant.label ?? "unit",
          rate: Number(variant.discountPrice ?? variant.sellingPrice),
          stock: Number(variant.stock),
        })),
      )
      .filter((option) => option.stock > 0)
      .filter((option) => {
        if (!q) return true;

        return `${option.title} ${option.subtitle} ${option.unit} ${option.stock} ${option.rate}`
          .toLowerCase()
          .includes(q);
      })
      .slice(0, 8);
  }, [products, productQuery]);

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
    setReceiptOption("current");
  };

  const addProductToCart = (option: (typeof catalogOptions)[number]) => {
    if (option.stock <= 0) {
      toast.error(`${option.title} (${option.unit}) is out of stock`);
      return;
    }

    const newItem: CartItem = {
      key: crypto.randomUUID(),
      inventoryId: option.inventoryId,
      productId: option.productId,
      productVariantId: option.productVariantId,
      product: option.title,
      unit: option.unit,
      rate: option.rate,
      quantity: 1,
      maxStock: option.stock,
    };

    setItems((prev) => {
      const existing = prev.find((item) => item.productVariantId === option.productVariantId);

      if (existing) {
        if (existing.maxStock !== undefined && existing.quantity >= existing.maxStock) {
          toast.error(
            `Only ${existing.maxStock} ${existing.unit} of ${existing.product} is in stock`,
          );

          return prev;
        }

        return prev.map((item) =>
          item.key === existing.key
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item,
        );
      }

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

  const updateItem = (key: string, patch: Partial<CartItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      return toast.error("Add at least one product to the sale");
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        return toast.error(`Enter a valid quantity for ${item.product}`);
      }

      if (item.maxStock !== undefined && item.quantity > item.maxStock) {
        return toast.error(`Only ${item.maxStock} ${item.unit} of ${item.product} in stock`);
      }
    }

    let customerId = customer?.id ?? selectedCustomerId ?? undefined;

    if (!customerId && customerMode === "new") {
      if (!newCustomer.name.trim() || !newCustomer.mobile.trim()) {
        return toast.error("Enter the customer's name and mobile number");
      }
    } else if (!customerId) {
      return toast.error("Select or create a customer");
    }

    if (paidNum < 0) {
      return toast.error("Paid amount cannot be negative");
    }

    if (paidNum > total) {
      return toast.error("Paid amount cannot exceed the total");
    }

    setSubmitting(true);

    try {
      /*
       * ---------------------------------------------------------
       * STEP 1: CREATE CUSTOMER IF NEEDED
       * ---------------------------------------------------------
       */

      if (!customerId) {
        const created = await shopStore.addCustomer({
          name: newCustomer.name.trim(),
          mobile: newCustomer.mobile.trim(),
          village: newCustomer.village.trim(),
          address: newCustomer.address.trim(),
          joinedOn: new Date().toISOString().slice(0, 10),
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

      /*
       * ---------------------------------------------------------
       * STEP 2: SAVE THE SALE
       *
       * IMPORTANT:
       * We pass "none" here so createKhataSale does not
       * automatically send another WhatsApp receipt.
       *
       * The WhatsApp receipt is handled explicitly below
       * through the Edge Function.
       * ---------------------------------------------------------
       */

      const txId = await shopStore.createKhataSale({
        customerId,

        items: items.map((item) => ({
          ...(item.inventoryId ? { inventoryId: item.inventoryId } : {}),
          ...(item.productId ? { productId: item.productId } : {}),
          ...(item.productVariantId ? { productVariantId: item.productVariantId } : {}),
          product: item.product,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
        })),

        paid: paidNum,
        method,
        date: entryDate,

        ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
      });

      /*
       * ---------------------------------------------------------
       * STEP 3: NONE
       *
       * Sale is already saved.
       * Do not call Edge Function.
       * ---------------------------------------------------------
       */

      if (receiptOption === "none") {
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

        return;
      }

      /*
       * ---------------------------------------------------------
       * STEP 4: FIND CUSTOMER DATA FOR RECEIPT
       * ---------------------------------------------------------
       */

      const receiptCustomer = customer
        ? {
            id: customer.id,
            name: customer.name,
            mobile: customer.mobile ?? customers.find((c) => c.id === customer.id)?.mobile ?? "",
          }
        : {
            id: customerId,
            name: selectedCustomer?.name ?? newCustomer.name.trim(),
            mobile: selectedCustomer?.mobile ?? newCustomer.mobile.trim(),
          };

      try {
        await sendKhataReceiptToEdgeFunction({
          receiptOption,

          customerId,

          transactionId: txId,

          customer: receiptCustomer,

          items,

          total,

          paid: paidNum,

          due,

          paymentMethod: method,

          saleDate: entryDate,
        });

        toast.success(
          receiptOption === "full"
            ? "Sale recorded and full receipt sent"
            : "Sale recorded and current receipt sent",
        );
      } catch (receiptError) {
        /*
         * IMPORTANT:
         * Sale has already been successfully saved.
         *
         * Therefore we DO NOT show "sale failed".
         * We only tell the admin that WhatsApp receipt failed.
         */

        toast.error(
          receiptError instanceof Error
            ? `Sale saved, but receipt failed: ${receiptError.message}`
            : "Sale saved, but WhatsApp receipt could not be sent",
        );
      }

      /*
       * ---------------------------------------------------------
       * STEP 6: FINISH
       * ---------------------------------------------------------
       */

      onCreated?.(txId);
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record the sale");
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>

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
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={customerMode === "select" ? "default" : "outline"}
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
                  variant={customerMode === "new" ? "default" : "outline"}
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

              {customerMode === "select" ? (
                <div className="space-y-2">
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Selected customer</p>

                        <p className="font-medium">{selectedCustomer.name}</p>

                        <p className="text-xs text-muted-foreground">{selectedCustomer.mobile}</p>
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
                    <>
                      <Input
                        placeholder="Search by name or mobile"
                        value={customerQuery}
                        onChange={(e) => setCustomerQuery(e.target.value)}
                      />

                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {filteredCustomers.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => {
                              setCustomerMode("select");
                              setSelectedCustomerId(c.id);
                              setCustomerQuery(c.name);
                            }}
                            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${
                              selectedCustomerId === c.id
                                ? "border border-primary bg-primary/5 font-medium"
                                : ""
                            }`}
                          >
                            <span>{c.name}</span>

                            <span className="text-muted-foreground">
                              {c.village || "Village not available"}
                            </span>
                          </button>
                        ))}

                        {filteredCustomers.length === 0 && (
                          <p className="px-3 py-2 text-sm text-muted-foreground">
                            No customers found
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
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
            <Label>Add products from inventory</Label>

            <Input
              placeholder="Search inventory product, stock or price"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              {catalogOptions.map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => addProductToCart(option)}
                >
                  {option.emoji} {option.title} · {formatCurrency(option.rate)} · {option.stock}{" "}
                  {option.unit}
                </Button>
              ))}

              {catalogOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">No matching inventory items</p>
              )}
            </div>
          </div>

          {/* Cart Table */}
          {items.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-20">Qty</TableHead>
                    <TableHead className="w-24">Rate</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell className="font-medium">
                        {item.product}

                      <div>{item.product}</div>
<div className="text-xs text-muted-foreground">
  {item.unit} · Stock {item.maxStock ?? "—"}
</div>
                      </TableCell>

                      <TableCell>
                        <Input
                          type="text"
                          inputMode="numeric"
                          minLength={1}
                          className="h-8 w-16"
                          value={item.quantity}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => {
                            const nextQuantity = Number(e.target.value) || 0;

                            if (item.maxStock !== undefined && nextQuantity > item.maxStock) {
                              toast.error(
                                `Only ${item.maxStock} ${item.unit} of ${item.product} in stock`,
                              );

                              updateItem(item.key, {
                                quantity: item.maxStock,
                              });

                              return;
                            }

                            updateItem(item.key, {
                              quantity: nextQuantity,
                            });
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          type="text"
                          inputMode="decimal"
                          className="h-8 w-20"
                          value={item.rate}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) =>
                            updateItem(item.key, {
                              rate: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </TableCell>

                      <TableCell className="text-right">
                        {formatCurrency(item.quantity * item.rate)}
                      </TableCell>

                      <TableCell>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(item.key)}
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

          {/* Custom Item Entry */}
          <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto]">
            <Input
              placeholder="Custom item name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />

            <Input
              className="w-32"
              type="text"
              inputMode="decimal"
              min="0"
              placeholder="Price"
              value={customRate}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setCustomRate(e.target.value)}
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
                type="text"
                inputMode="decimal"
                min="0"
                value={paid}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setPaid(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Payment method</Label>

              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>

                  <SelectItem value="upi">UPI</SelectItem>

                  <SelectItem value="bank">Bank transfer</SelectItem>

                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Date</Label>

              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Remarks (optional)</Label>

              <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>

          {/* Receipt Options Section */}
          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-sm font-medium">Receipt send options</Label>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "current", label: "Current receipt" },
                { id: "full", label: "Full receipt" },
                { id: "none", label: "No receipt" },
              ].map((opt) => {
                const active = receiptOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReceiptOption(opt.id as "current" | "full" | "none")}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-xs font-medium transition-all ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div
                      className={`flex size-4 items-center justify-center rounded-full border ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground"
                      }`}
                    >
                      {active && <Check className="size-3" />}
                    </div>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
            <span>
              Total: <strong>{formatCurrency(total)}</strong>
            </span>

            <span>
              Paid: <strong className="text-success">{formatCurrency(paidNum)}</strong>
            </span>

            <span>
              Due:{" "}
              <strong className={due > 0 ? "text-warning" : "text-success"}>
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
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Save sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
