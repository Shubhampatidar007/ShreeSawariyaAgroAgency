import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IndianRupee, Printer, Truck, Wallet } from "lucide-react";
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
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
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
    </div>
  );
}