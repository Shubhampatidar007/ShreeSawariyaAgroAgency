import { useMemo } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { IndianRupee, Printer, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency, formatDate, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/ledger/suppliers/$supplierId")({
  head: () => ({
    meta: [
      { title: "Supplier Ledger — AgriKisan Admin" },
      { name: "description", content: "Supplier purchases, payments, advances and running balance." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupplierLedgerPage,
});

function SupplierLedgerPage() {
  const { supplierId } = Route.useParams();
  const supplier = useShopStore((s) => s.suppliers.find((x) => x.id === supplierId));
  const ledger = useShopStore((s) => s.supplierLedger.filter((e) => e.supplierId === supplierId));
  const sorted = useMemo(() => [...ledger].sort((a, b) => b.date.localeCompare(a.date)), [ledger]);

  if (!supplier) {
    return (
      <EmptyState
        icon={Truck}
        title="Supplier not found"
        description="This supplier no longer exists."
        action={
          <Button className="rounded-full" asChild>
            <Link to="/admin/suppliers">Back to suppliers</Link>
          </Button>
        }
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
          <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </Button>
        }
      />

      <SummaryCards
        items={[
          { label: "Total purchases", value: formatCurrency(supplier.totalPurchases), icon: IndianRupee },
          { label: "Total paid", value: formatCurrency(supplier.totalPaid), icon: Wallet, tone: "success" },
          { label: "Advance", value: formatCurrency(supplier.advance), icon: Wallet },
          {
            label: "Due balance",
            value: formatCurrency(supplier.dueBalance),
            icon: Truck,
            tone: supplier.dueBalance > 0 ? "warning" : "success",
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Ledger entries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground">{formatDate(entry.date)}</TableCell>
                      <TableCell className="capitalize font-medium">{entry.type}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.reference}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(entry.balance)}
                      </TableCell>
                      <TableCell className="uppercase text-muted-foreground">{entry.method}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline
              items={sorted.map((entry) => ({
                id: entry.id,
                title: `${entry.type} · ${entry.reference}`,
                meta: `${formatDate(entry.date)} · ${entry.method.toUpperCase()}`,
                description: `Running balance ${formatCurrency(entry.balance)}`,
                amount: formatCurrency(entry.amount),
                tone: entry.type === "purchase" ? "warning" : "success",
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}