import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <PlaceholderPage
      icon={Boxes}
      title="Inventory"
      description="Live stock across godown and counter with reorder alerts."
      phase="Phase 2"
      plannedFeatures={[
        "Stock in and stock out entries",
        "Reorder level alerts",
        "Godown to counter transfers",
        "Damage and expiry write-offs",
      ]}
    />
  );
}
