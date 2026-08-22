import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { IndianRupee, Pencil, Trash2, Truck, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SupplierCard } from "@/components/shared/EntityCards";
import { formatCurrency, formatDate, shopStore, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/suppliers/")({
  head: () => ({
    meta: [
      { title: "Suppliers — Admin" },
      { name: "description", content: "Supplier directory with purchases, advances and dues." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupplierListPage,
});

function SupplierListPage() {
  const suppliers = useShopStore((s) => s.suppliers);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return suppliers.filter(
      (supplier) =>
        !term ||
        supplier.company.toLowerCase().includes(term) ||
        supplier.name.toLowerCase().includes(term) ||
        supplier.mobile.includes(term),
    );
  }, [suppliers, query]);

  const totals = useMemo(
    () => ({
      purchases: suppliers.reduce((sum, s) => sum + s.totalPurchases, 0),
      due: suppliers.reduce((sum, s) => sum + s.dueBalance, 0),
    }),
    [suppliers],
  );

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Suppliers" }]}
        eyebrow="Module"
        title="Suppliers"
        description="Company directory, purchase records, advances and outstanding balances."
      />

      <SummaryCards
        items={[
          { label: "Suppliers", value: String(suppliers.length), icon: Truck },
          { label: "Total purchases", value: formatCurrency(totals.purchases), icon: IndianRupee },
          {
            label: "Outstanding due",
            value: formatCurrency(totals.due),
            icon: Wallet,
            tone: "warning",
          },
          {
            label: "Active",
            value: String(suppliers.filter((s) => s.status === "active").length),
            icon: Truck,
            tone: "success",
          },
        ]}
      />

      <SearchToolbar value={query} onChange={setQuery} placeholder="Search supplier or company…" />

      {rows.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No suppliers found"
          description="Adjust your search to find a supplier."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {rows.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} />
            ))}
          </div>
          <Card className="hidden overflow-hidden shadow-soft lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Supplies</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Last order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ledger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((supplier) => (
                  <TableRow key={supplier.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{supplier.company}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {supplier.name} · {supplier.mobile}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {supplier.productsSupplied.join(", ")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(supplier.totalPurchases)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(supplier.dueBalance)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(supplier.lastOrder)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={supplier.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          to="/admin/ledger/suppliers/$supplierId"
                          params={{ supplierId: supplier.id }}
                        >
                          Open
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
