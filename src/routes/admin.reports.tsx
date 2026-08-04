import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart } from "lucide-react";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <PlaceholderPage
      icon={FileBarChart}
      title="Reports"
      description="Sales, purchase, GST and stock valuation reports."
      phase="Phase 4"
      plannedFeatures={[
        "Daily and monthly sales reports",
        "GSTR-ready summaries",
        "Stock valuation",
        "Export to Excel and PDF",
      ]}
    />
  );
}
