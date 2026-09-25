import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/layout/Logo";
import { adminNavSections } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type AdminSidebarProps = {
  onNavigate?: () => void;
};

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const { t } = useI18n();
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
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
              {section.titleKey ? t(section.titleKey, section.title) : section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/70 hover:-translate-y-px hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand-lime transition-opacity duration-200",
                          active ? "opacity-100" : "opacity-0 group-hover:opacity-70",
                        )}
                      />
                      <item.icon
                        className={cn(
                          "size-4 shrink-0 transition-transform duration-200",
                          active ? "scale-105" : "group-hover:scale-105",
                        )}
                      />
                      <span className="truncate">
                        {item.labelKey ? t(item.labelKey, item.label) : item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

    </div>
  );
}
