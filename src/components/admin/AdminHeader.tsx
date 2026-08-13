import { Home, PanelLeftClose, Search, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CommandPalette, useCommandPalette } from "@/components/shared/CommandPalette";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { authStore, useAuth } from "@/lib/auth-store";
import { AdminNotificationCenter } from "@/components/admin/AdminNotificationCenter";

type AdminHeaderProps = {
  onToggleSidebar: () => void;
};

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const { t } = useI18n();
  const { open, setOpen } = useCommandPalette();
  const user = useAuth();
  const displayName = user?.name ?? t("common.guest", "Guest");
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-card/90 px-3 backdrop-blur-xl sm:px-4 md:gap-3 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="hidden size-10 rounded-full lg:inline-flex"
        aria-label="Collapse sidebar"
        onClick={onToggleSidebar}
      >
        <PanelLeftClose className="size-5" />
      </Button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-w-0 max-w-md flex-1 items-center gap-2 rounded-full border border-border bg-muted/60 px-3.5 py-2.5 text-left text-sm text-muted-foreground transition-all hover:border-primary/40 hover:bg-muted md:flex"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">{t("common.searchPlaceholder")}</span>
        <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold lg:inline-block">⌘K</kbd>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="size-10 rounded-full md:hidden"
        aria-label={t("common.search")}
        onClick={() => setOpen(true)}
      >
        <Search className="size-5" />
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle className="size-10 rounded-full" />
        <AdminNotificationCenter />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-0.5 flex size-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted sm:ml-1 sm:w-auto sm:gap-2.5 sm:py-1 sm:pl-1 sm:pr-3"
              aria-label={`Account: ${displayName}`}
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {initials || "AK"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-xs font-semibold">{displayName}</p>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {user?.role === "admin" ? "Owner" : (user?.role ?? "Guest")}
                </Badge>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl">
            <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin/profile">
                <UserRound className="size-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/">
                <Home className="size-4" /> Homepage
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void authStore.logout()}>
              {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </header>
  );
}
