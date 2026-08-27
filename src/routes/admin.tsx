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
import {
  isAdminSectionLoaded,
  loadAdminRouteData,
} from "@/lib/admin-route-data-v2";
import { ensureAdminProductCatalog } from "@/lib/admin-supporting-data";
import { supabase } from "@/integrations/supabase/client";
import { shopStore } from "@/lib/shop-store";
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

const INVENTORY_SUPPLIER_COLUMNS =
  "id,name,company,mobile,email,gstin,address,products_supplied,total_purchases,total_paid,advance,due_balance,last_order,status";

function setInventorySuppliers(rows: any[]) {
  const state = shopStore.get() as any;
  state.suppliers = rows.map((row) => ({
    id: row.id,
    name: row.name ?? "",
    company: row.company ?? "",
    mobile: row.mobile ?? "",
    email: row.email ?? "",
    gstin: row.gstin ?? "",
    address: row.address ?? "",
    productsSupplied: row.products_supplied ?? [],
    totalPurchases: Number(row.total_purchases ?? 0),
    totalPaid: Number(row.total_paid ?? 0),
    advance: Number(row.advance ?? 0),
    dueBalance: Number(row.due_balance ?? 0),
    lastOrder: row.last_order ?? "",
    status: row.status,
  }));
  shopStore.setDraftProduct(state.draftProduct ?? null);
}

async function loadInventorySuppliers() {
  const { data, error } = await supabase
    .from("suppliers")
    .select(INVENTORY_SUPPLIER_COLUMNS)
    .order("name");

  if (error) throw error;
  setInventorySuppliers(data ?? []);
}

function SectionDataLoader() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center rounded-2xl border border-border/70 bg-card/50">
      <div className="w-full max-w-sm px-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <span className="size-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        </div>
        <h2 className="mt-4 font-display text-lg font-semibold">Loading section</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Fetching only the data required for this admin section.
        </p>
      </div>
    </div>
  );
}

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const location = useLocation();
  const user = useAuth();
  const ready = useAuthReady();

  useEffect(() => {
    if (!ready || !user || (user.role !== "admin" && user.role !== "staff")) return;

    const isInventoryRoute = location.pathname.startsWith("/admin/inventory");
    const sectionLoaded = isAdminSectionLoaded(location.pathname);

    if (sectionLoaded && !isInventoryRoute) {
      setSectionLoading(false);
      return;
    }

    let cancelled = false;
    setSectionLoading(true);

    void (async () => {
      if (!sectionLoaded) {
        await loadAdminRouteData(location.pathname);
      }

      if (location.pathname.startsWith("/admin/customers") || location.pathname.startsWith("/admin/khata")) {
        await ensureAdminProductCatalog();
      }

      if (isInventoryRoute) {
        await loadInventorySuppliers();
      }
    })()
      .catch((error) => {
        console.error("Admin section data load failed:", error);
      })
      .finally(() => {
        if (!cancelled) setSectionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, ready, user?.id, user?.role]);

  if (!ready) return <AdminDataLoader />;

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
      <div
        className={cn("min-h-screen transition-[padding]", sidebarOpen ? "lg:pl-64" : "lg:pl-0")}
      >
        <AdminHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="mx-auto max-w-7xl px-3 pb-24 pt-4 sm:px-4 md:px-6 md:pb-8 md:pt-8">
          <div key={location.pathname} className="admin-page-transition space-y-8">
            {sectionLoading ? <SectionDataLoader /> : <Outlet />}
            {!sectionLoading && location.pathname === "/admin" ? <DashboardEnhancements /> : null}
          </div>
        </main>
      </div>
      <MobileAdminNav />
      <LowStockReminderPopup />
    </div>
  );
}
