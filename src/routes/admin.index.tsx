import { createFileRoute } from "@tanstack/react-router";
import { AdminOverviewOptimized } from "@/components/admin/AdminOverviewOptimized";

export const Route = createFileRoute("/admin/")({ component: AdminOverview });

function AdminOverview() {
  return <AdminOverviewOptimized />;
}
