import { useState } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — AgriKisan Shop Management" },
      {
        name: "description",
        content: "Manage inventory, sales, customers and shop operations from one panel.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border transition-transform lg:block",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <AdminSidebar />
      </aside>

      <div className={cn("transition-[padding]", sidebarOpen ? "lg:pl-64" : "lg:pl-0")}>
        <AdminHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}