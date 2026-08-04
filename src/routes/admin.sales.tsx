import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/sales")({
  component: SalesPage,
});

function SalesPage() {
  return (
    <PlaceholderPage
      icon={Receipt}
      title="Sales & Billing"
      description="Counter billing, invoices, returns and khata settlements."
      phase="Phase 3"
      plannedFeatures={[
        "Fast counter billing screen",
        "GST invoice printing",
        "Sales returns and credit notes",
        "Khata payment collection",
      ]}
    />
  );
}
