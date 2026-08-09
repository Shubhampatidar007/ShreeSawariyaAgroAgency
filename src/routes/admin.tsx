import { useState } from "react";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useAuth, useAuthReady } from "@/lib/auth-store";
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
  const user = useAuth();
  const ready = useAuthReady();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your access…</p>
      </div>
    );
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

      <div className={cn("transition-[padding]", sidebarOpen ? "lg:pl-64" : "lg:pl-0")}>
        <AdminHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}