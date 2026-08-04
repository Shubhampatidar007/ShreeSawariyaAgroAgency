import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <PlaceholderPage
      icon={TrendingUp}
      title="Analytics"
      description="Seasonal demand trends and product performance insights."
      phase="Phase 4"
      plannedFeatures={[
        "Season-wise demand curves",
        "Top and slow moving products",
        "Village-level sales heatmap",
        "Profit margin analysis",
      ]}
    />
  );
}
