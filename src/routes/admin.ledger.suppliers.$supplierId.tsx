import { useMemo , useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  IndianRupee,
  Printer,
  Truck,
  Wallet,
  CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { DetailHeader } from "@/components/shared/DetailHeader";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { Timeline } from "@/components/shared/Timeline";
import {
  formatCurrency,
  formatDate,
  shopStore,
  useShopStore,
} from "@/lib/shop-store";

export const Route = createFileRoute("/admin/ledger/suppliers/$supplierId")({
  head: () => ({
    meta: [
      { title: "Supplier Ledger — Admin" },
      {
        name: "description",
        content:
          "Supplier purchases, payments, advances and running balance.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupplierLedgerPage,
});

function SupplierLedgerPage() {
  const { supplierId } = Route.useParams();
const [paymentOpen, setPaymentOpen] = useState(false);
const [paymentAmount, setPaymentAmount] = useState("");
const [paymentDate, setPaymentDate] = useState(
  new Date().toISOString().slice(0, 10),
);
const [paymentMethod, setPaymentMethod] = useState<
  "cash" | "upi" | "bank" | "cheque"
>("cash");
const [paymentReference, setPaymentReference] = useState("");
const [paymentRemarks, setPaymentRemarks] = useState("");
const [paymentSaving, setPaymentSaving] = useState(false);
const [paymentError, setPaymentError] = useState("");
  const supplier = useShopStore((s) =>
    s.suppliers.find((x) => x.id === supplierId),
  );

  const ledger = useShopStore((s) =>
    s.supplierLedger.filter((entry) => entry.supplierId === supplierId),
  );

  const sorted = useMemo(
    () =>
      [...ledger].sort((a, b) => {
        return b.date.localeCompare(a.date);
      }),
    [ledger],
  );

  if (!supplier) {
    return (
      <EmptyState
        icon={Truck}
        title="Supplier not found"
        description="This supplier no longer exists."
        action={<span />}
      />
    );
  }

  return (
    <div className="space-y-6">
      <DetailHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Suppliers", to: "/admin/suppliers" },
          { label: supplier.company },
          { label: "Ledger" },
        ]}
        title={`${supplier.company} — Ledger`}
        subtitle={`${supplier.name} · ${supplier.mobile} · GSTIN ${supplier.gstin}`}
        actions={
  <div className="flex items-center gap-2">
    <Button
      className="rounded-full"
      onClick={() => {
        setPaymentError("");
        setPaymentAmount("");
        setPaymentReference("");
        setPaymentRemarks("");
        setPaymentDate(
          new Date().toISOString().slice(0, 10),
        );
        setPaymentMethod("cash");
        setPaymentOpen(true);
      }}
      disabled={supplier.dueBalance <= 0}
    >
      <CreditCard className="mr-2 h-4 w-4" />
      Pay Supplier
    </Button>

    <Button
      variant="outline"
      className="rounded-full"
      onClick={() => window.print()}
    >
      <Printer className="mr-2 h-4 w-4" />
      Print
    </Button>
  </div>
}
      />

      <SummaryCards
        items={[
          {
            label: "Total purchases",
            value: formatCurrency(supplier.totalPurchases),
            icon: IndianRupee,
          },
          {
            label: "Total paid",
            value: formatCurrency(supplier.totalPaid),
            icon: Wallet,
            tone: "success",
          },
          {
            label: "Advance",
            value: formatCurrency(supplier.advance),
            icon: Wallet,
          },
          {
            label: "Due balance",
            value: formatCurrency(supplier.dueBalance),
            icon: Truck,
            tone:
              supplier.dueBalance > 0
                ? "warning"
                : "success",
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">
              Purchase history
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">
                      Quantity
                    </TableHead>
                    <TableHead className="text-right">
                      Rate
                    </TableHead>
                    <TableHead className="text-right">
                      Amount
                    </TableHead>
                    <TableHead className="text-right">
                      Balance
                    </TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sorted.map((entry) => {
                    const quantity = Number(entry.quantity) || 0;
                    const unit = entry.unit || "";
                    const rate = Number(entry.unitPrice) || 0;

                    const isPurchase =
                      entry.type.toLowerCase() === "purchase";

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(entry.date)}
                        </TableCell>

                        <TableCell>
                          <span className="font-medium capitalize">
                            {entry.type}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="min-w-[140px]">
                            <p className="font-medium">
                              {entry.productName ||
                                entry.reference ||
                                "—"}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          {isPurchase && quantity > 0 ? (
                            <span>
                              {quantity.toLocaleString("en-IN")}{" "}
                              {unit}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          {isPurchase && rate > 0
                            ? formatCurrency(rate)
                            : "—"}
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap font-medium">
                          {formatCurrency(entry.amount)}
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap font-semibold">
                          {formatCurrency(entry.balance)}
                        </TableCell>

                        <TableCell className="uppercase text-xs text-muted-foreground">
                          {entry.method || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {sorted.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-12 text-center text-muted-foreground"
                      >
                        No ledger entries yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">
              Timeline
            </CardTitle>
          </CardHeader>

          <CardContent>
            {sorted.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              <Timeline
                items={sorted.map((entry) => {
                  const quantity = Number(entry.quantity) || 0;
                  const unit = entry.unit || "";
                  const rate = Number(entry.unitPrice) || 0;

                  const isPurchase =
                    entry.type.toLowerCase() === "purchase";

                  return {
                    id: entry.id,

                    title: isPurchase
                      ? `Purchase · ${
                          entry.productName ||
                          entry.reference ||
                          "Item"
                        }`
                      : `${entry.type} · ${entry.reference}`,

                    meta: isPurchase && quantity > 0
                      ? `${formatDate(entry.date)} · ${quantity.toLocaleString(
                          "en-IN",
                        )} ${unit} × ${formatCurrency(rate)} · ${entry.method.toUpperCase()}`
                      : `${formatDate(entry.date)} · ${entry.method.toUpperCase()}`,

                    description: `Running balance ${formatCurrency(
                      entry.balance,
                    )}`,

                    amount: formatCurrency(entry.amount),

                    tone: isPurchase
                      ? "warning"
                      : "success",
                  };
                })}
              />
            )}
          </CardContent>
        </Card>
      </div>
           <Dialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pay Supplier</DialogTitle>

            <DialogDescription>
              Record a payment made to {supplier.company}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                Supplier
              </p>

              <p className="font-semibold">
                {supplier.company}
              </p>

              <p className="text-sm text-muted-foreground">
                {supplier.name}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-payment-amount">
                Payment amount
              </Label>

            <Input
  id="supplier-payment-amount"
  type="number"
  value={paymentAmount}
  onChange={(e) => setPaymentAmount(e.target.value)}
  inputMode="decimal"
  min="0"
  step="0.01"
  placeholder="Enter amount"
  className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
/>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-payment-date">
                Payment date
              </Label>

              <Input
                id="supplier-payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) =>
                  setPaymentDate(e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Payment method</Label>

              <Select
                value={paymentMethod}
                onValueChange={(value) =>
                  setPaymentMethod(
                    value as
                      | "cash"
                      | "upi"
                      | "bank"
                      | "cheque",
                  )
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
                    Bank Transfer
                  </SelectItem>

                  <SelectItem value="cheque">
                    Cheque
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-payment-reference">
                Transaction ID / Reference
                <span className="ml-1 text-muted-foreground">
                  (optional)
                </span>
              </Label>

              <Input
                id="supplier-payment-reference"
                value={paymentReference}
                onChange={(e) =>
                  setPaymentReference(e.target.value)
                }
                placeholder="Transaction ID, UTR, cheque no., etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-payment-remarks">
                Remarks
                <span className="ml-1 text-muted-foreground">
                  (optional)
                </span>
              </Label>

              <Input
                id="supplier-payment-remarks"
                value={paymentRemarks}
                onChange={(e) =>
                  setPaymentRemarks(e.target.value)
                }
                placeholder="Payment notes"
              />
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Current due
                </span>

                <span className="font-semibold">
                  {formatCurrency(supplier.dueBalance)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Payment
                </span>

                <span className="font-semibold">
                  {formatCurrency(
                    Number(paymentAmount) || 0,
                  )}
                </span>
              </div>

              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">
                  Remaining due
                </span>

                <span className="font-bold">
                  {formatCurrency(
                    Math.max(
                      0,
                      supplier.dueBalance -
                        (Number(paymentAmount) || 0),
                    ),
                  )}
                </span>
              </div>
            </div>

            {paymentError && (
              <p className="text-sm text-destructive">
                {paymentError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentOpen(false)}
              disabled={paymentSaving}
            >
              Cancel
            </Button>

            <Button
              disabled={
                paymentSaving ||
                !Number(paymentAmount) ||
                Number(paymentAmount) <= 0 ||
                Number(paymentAmount) > supplier.dueBalance
              }
              onClick={async () => {
                const amount = Number(paymentAmount);

                if (!amount || amount <= 0) {
                  setPaymentError(
                    "Enter a valid payment amount.",
                  );
                  return;
                }

                if (amount > supplier.dueBalance) {
                  setPaymentError(
                    `Payment cannot exceed the current due of ${formatCurrency(
                      supplier.dueBalance,
                    )}.`,
                  );
                  return;
                }

                setPaymentSaving(true);
                setPaymentError("");

                try {
                  await shopStore.recordSupplierPayment({
                    supplierId: supplier.id,
                    amount,
                    method: paymentMethod,
                    date: paymentDate,
                    reference:
                      paymentReference.trim(),
                    remarks: paymentRemarks.trim(),
                  });

                  setPaymentOpen(false);
                } catch (error) {
                  setPaymentError(
                    error instanceof Error
                      ? error.message
                      : "Failed to record payment.",
                  );
                } finally {
                  setPaymentSaving(false);
                }
              }}
            >
              {paymentSaving
                ? "Recording..."
                : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}