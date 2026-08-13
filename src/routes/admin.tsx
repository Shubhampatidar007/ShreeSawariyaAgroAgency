import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminDataLoader } from "@/components/admin/AdminDataLoader";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { DashboardEnhancements } from "@/components/admin/DashboardEnhancements";
import { LowStockReminderPopup } from "@/components/admin/LowStockReminderPopup";
import { MobileAdminNav } from "@/components/admin/MobileAdminNav";
import { useAuth, useAuthReady } from "@/lib/auth-store";
import { useShopStore } from "@/lib/shop-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Shop Management" },
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
  const [minimumLoaderDone, setMinimumLoaderDone] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const shopLoading = useShopStore((state) => state.loading);
  const user = useAuth();
  const ready = useAuthReady();

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumLoaderDone(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready || !minimumLoaderDone || shopLoading) {
    return <AdminDataLoader />;
  }

  if (!user || (user.role !== "admin" && user.role !== "staff")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <ShieldAlert className="mx-auto size-10 text-destructive" />
          <h1 className="mt-4 font-display text-xl font-semibold">Staff access only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {user
              ? "This account does not have shop management permissions. Ask the shop owner for staff access."
              : "Please sign in with your shop owner or staff account to open the management panel."}
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/">Back to the shop</Link>
          </Button>
        </div>
      </div>
    );
  }

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

      <div className={cn("min-h-screen transition-[padding]", sidebarOpen ? "lg:pl-64" : "lg:pl-0")}>
        <AdminHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="mx-auto max-w-7xl px-3 pb-24 pt-4 sm:px-4 md:px-6 md:pb-8 md:pt-8">
          <div key={location.pathname} className="admin-page-transition space-y-8">
            <Outlet />
            {location.pathname === "/admin" ? <DashboardEnhancements /> : null}
          </div>
        </main>
      </div>

      <MobileAdminNav />
      <LowStockReminderPopup />
    </div>
  );
}
