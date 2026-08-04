import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/suppliers")({
  component: SuppliersPage,
});

function SuppliersPage() {
  return (
    <PlaceholderPage
      icon={Truck}
      title="Suppliers"
      description="Purchase orders, supplier ledgers and goods receipts."
      phase="Phase 3"
      plannedFeatures={[
        "Supplier directory",
        "Purchase orders and receipts",
        "Supplier payment ledger",
        "Price comparison",
      ]}
    />
  );
}
