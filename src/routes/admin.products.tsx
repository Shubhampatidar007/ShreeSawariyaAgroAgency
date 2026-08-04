import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/products")({
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <PlaceholderPage
      icon={Package}
      title="Products"
      description="Full catalogue with batches, HSN codes, pricing tiers and images."
      phase="Phase 2"
      plannedFeatures={[
        "Product create and edit forms",
        "Batch, expiry and HSN tracking",
        "Category and brand mapping",
        "Bulk CSV import",
      ]}
    />
  );
}
