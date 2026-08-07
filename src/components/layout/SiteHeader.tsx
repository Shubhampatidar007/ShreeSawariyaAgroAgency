import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, LogOut, Mail, Menu, Phone, Search, ShoppingCart, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { AuthDialog, type AuthMode } from "@/components/auth/AuthDialog";
import { authStore, useAuth } from "@/lib/auth-store";
import { useI18n } from "@/lib/i18n";
import { storefrontNav } from "@/data/navigation";
import { shopInfo } from "@/data/storefront";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const user = useAuth();
  const { t } = useI18n();

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="hidden border-b border-border bg-muted text-muted-foreground md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2 text-xs">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5" /> {shopInfo.phone}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="size-3.5" /> {shopInfo.email}
            </span>
          </div>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" /> {shopInfo.hours}
          </span>
        </div>
      </div>

      <div className="border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:px-6">
          <Logo />

          <div className="relative ml-4 hidden flex-1 lg:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("storefront.searchPlaceholder", "Search seeds, fertilizers, sprayers…")}
              className="h-11 rounded-full bg-muted pl-10"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <LanguageToggle className="rounded-full" />
            <ThemeToggle className="rounded-full" />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full">
                    <User className="size-4" />
                    <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="flex flex-col">
                    <span>{user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user.mobile}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin">{t("storefront.adminPanel", "Shop admin panel")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => authStore.logout()}>
                    <LogOut className="size-4" /> {t("common.logout", "Logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="hidden rounded-full sm:inline-flex"
                  onClick={() => openAuth("login")}
                >
                  <User className="size-4" /> {t("auth.login", "Login")}
                </Button>
                <Button
                  className="hidden rounded-full sm:inline-flex"
                  onClick={() => openAuth("register")}
                >
                  {t("auth.register", "Register")}
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Cart">
              <ShoppingCart className="size-5" />
              <Badge className="absolute -right-0.5 -top-0.5 size-5 justify-center rounded-full p-0 text-[10px]">
                3
              </Badge>
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle>Menu</SheetTitle>
                <nav className="mt-6 flex flex-col gap-1">
                  {storefrontNav.map((item) => (
                    <a
                      key={item.label}
                      href={item.to}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
                    >
                      {t(`storefront.nav.${item.label.toLowerCase()}`, item.label)}
                    </a>
                  ))}
                  {!user ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        openAuth("login");
                      }}
                      className="rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted"
                    >
                      {t("auth.login", "Login")} / {t("auth.register", "Register")}
                    </button>
                  ) : null}
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted"
                  >
                    {t("storefront.adminPanel", "Shop admin panel")}
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <nav className="hidden border-b border-border bg-background/95 backdrop-blur lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-6">
          {storefrontNav.map((item) => (
            <a
              key={item.label}
              href={item.to}
              className="px-3.5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {t(`storefront.nav.${item.label.toLowerCase()}`, item.label)}
            </a>
          ))}
          <Link
            to="/admin"
            className="ml-auto py-3 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t("storefront.adminPanel", "Shop admin panel")} →
          </Link>
        </div>
      </nav>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </header>
  );
}