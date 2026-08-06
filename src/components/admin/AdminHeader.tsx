import { Bell, Menu, PanelLeftClose, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { CommandPalette, useCommandPalette } from "@/components/shared/CommandPalette";
import { useI18n } from "@/lib/i18n";

type AdminHeaderProps = {
  onToggleSidebar: () => void;
};

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const { t } = useI18n();
  const { open, setOpen } = useCommandPalette();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-xl md:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <AdminSidebar />
        </SheetContent>
      </Sheet>

      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        aria-label="Collapse sidebar"
        onClick={onToggleSidebar}
      >
        <PanelLeftClose className="size-5" />
      </Button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden max-w-md flex-1 items-center gap-2 rounded-full border border-border bg-muted/60 px-3.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted md:flex"
      >
        <Search className="size-4" />
        <span className="truncate">{t("common.searchPlaceholder")}</span>
        <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={t("common.search")}
          onClick={() => setOpen(true)}
        >
          <Search className="size-5" />
        </Button>
        <LanguageToggle />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={t("common.notifications")}
            >
              <Bell className="size-5" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>{t("common.notifications")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin/reminders" className="flex-col items-start gap-0.5">
                <span className="text-sm font-medium">3 khata reminders due today</span>
                <span className="text-xs text-muted-foreground">₹42,300 across 3 farmers</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/inventory" className="flex-col items-start gap-0.5">
                <span className="text-sm font-medium">4 products below reorder level</span>
                <span className="text-xs text-muted-foreground">DAP, PR-126 seed and 2 more</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/sales" className="flex-col items-start gap-0.5">
                <span className="text-sm font-medium">2 online orders awaiting packing</span>
                <span className="text-xs text-muted-foreground">Placed in the last 4 hours</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-1 flex items-center gap-2.5 rounded-full border border-border py-1 pl-1 pr-3 transition-colors hover:bg-muted"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  AV
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-xs font-semibold">Anil Verma</p>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  Owner
                </Badge>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Anil Verma</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin/settings">{t("common.profile")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/settings">{t("common.settings")}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>{t("common.logout")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </header>
  );
}
