import { Link, useRouterState } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { adminNavSections } from "@/data/navigation";
import { cn } from "@/lib/utils";

type AdminSidebarProps = {
  onNavigate?: () => void;
};

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string) =>
    to === "/admin" ? pathname === "/admin" : pathname.startsWith(to);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo to="/admin" subtitle="Admin Panel" inverted />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {adminNavSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/45">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive(item.to)
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-xl bg-sidebar-accent p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-sidebar-accent-foreground">
            <LifeBuoy className="size-4" />
            Dealer support
          </div>
          <p className="mt-1 text-xs text-sidebar-foreground/65">
            Licence renewals, GST filing help and stock queries — 7 AM to 9 PM.
          </p>
          <a
            href="tel:+919876543210"
            className="mt-3 inline-block text-xs font-semibold text-sidebar-primary-foreground underline-offset-4 hover:underline"
          >
            +91 98765 43210
          </a>
        </div>
      </div>
    </div>
  );
}