import { Link, createFileRoute } from "@tanstack/react-router";
import { BookOpen, IndianRupee, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/admin/EmptyState";
import { DetailHeader } from "@/components/shared/DetailHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { formatCurrency, formatDate, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/suppliers/$supplierId")({
  head: () => ({
    meta: [
      { title: "Supplier Details — Admin" },
      {
        name: "description",
        content: "Supplier profile with products supplied, purchases and dues.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupplierDetailPage,
});

function SupplierDetailPage() {
  const { supplierId } = Route.useParams();
  const supplier = useShopStore((s) => s.suppliers.find((x) => x.id === supplierId));

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
        ]}
        title={supplier.company}
        subtitle={`${supplier.name} · ${supplier.mobile} · ${supplier.email}`}
        badge={<StatusBadge status={supplier.status} />}
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/admin/ledger/suppliers/$supplierId" params={{ supplierId }}>
              <BookOpen className="size-4" /> Open ledger
            </Link>
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
          { label: "Advance", value: formatCurrency(supplier.advance), icon: Wallet },
          {
            label: "Due balance",
            value: formatCurrency(supplier.dueBalance),
            icon: Truck,
            tone: supplier.dueBalance > 0 ? "warning" : "success",
          },
        ]}
      />

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Supplier information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Info label="GSTIN" value={supplier.gstin} />
          <Info label="Last order" value={formatDate(supplier.lastOrder)} />
          <Info label="Address" value={supplier.address} />
          <Info label="Products supplied" value={supplier.productsSupplied.join(", ")} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
