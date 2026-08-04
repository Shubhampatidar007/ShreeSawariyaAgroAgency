import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <PlaceholderPage
      icon={Users}
      title="Customers"
      description="Farmer profiles, village mapping and credit history."
      phase="Phase 3"
      plannedFeatures={[
        "Customer profiles and villages",
        "Khata ledger per customer",
        "Purchase history",
        "Due reminders over SMS",
      ]}
    />
  );
}
