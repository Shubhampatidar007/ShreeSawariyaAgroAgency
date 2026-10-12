import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Menu, Package, Receipt, Users } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { cn } from "@/lib/utils";

const primaryItems = [
  { to: "/admin", label: "Home", icon: LayoutDashboard },
  { to: "/admin/sales", label: "Sales", icon: Receipt },
  { to: "/admin/inventory", label: "Stock", icon: Package },
  { to: "/admin/customers", label: "Customers", icon: Users },
] as const;

export function MobileAdminNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const isActive = (to: string) =>
    to === "/admin" ? pathname === "/admin" : pathname.startsWith(to);
  const isMoreActive = !primaryItems.some((item) => isActive(item.to));

  return (
    <nav
      aria-label="Admin mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "h-auto min-h-14 min-w-0 flex-col gap-1 rounded-xl px-1 text-[11px] font-medium",
                isMoreActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-label="Open more admin pages"
              aria-expanded={moreOpen}
            >
              <Menu className="size-5 shrink-0" aria-hidden="true" />
              <span>More</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(86vw,20rem)] overflow-y-auto p-0">
            <SheetTitle className="sr-only">Admin navigation</SheetTitle>
            <AdminSidebar onNavigate={() => setMoreOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
