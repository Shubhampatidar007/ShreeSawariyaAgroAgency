import { useState } from "react";
import { Clock, LogOut, Mail, Menu, Search, User, X } from "lucide-react";
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
import { CartSheet } from "@/components/cart/CartSheet";
import { authStore, useAuth } from "@/lib/auth-store";
import { useI18n } from "@/lib/i18n";
import { storefrontNav } from "@/data/navigation";
import { shopInfo } from "@/data/storefront";
import { storefrontFilterStore, useStorefrontFilters } from "@/lib/storefront-filter-store";

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
    <header className="site-header sticky top-0 z-40 w-full">
      <div className="hidden border-b border-border bg-muted text-muted-foreground md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2 text-xs">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><span>{shopInfo.phone}</span></span>
            <span className="flex items-center gap-1.5"><Mail className="size-3.5" /> {shopInfo.email}</span>
          </div>
          <span className="flex items-center gap-1.5"><Clock className="size-3.5" /> {shopInfo.hours}</span>
        </div>
      </div>

      <div className="border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 md:gap-4 md:px-6">
          <Logo compactOnMobile className="min-w-0 shrink-0" />
          <SearchBox />

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
            <LanguageToggle className="rounded-full" />
            <ThemeToggle className="rounded-full" />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full"><User className="size-4" /><span className="hidden sm:inline">{user.name.split(" ")[0]}</span></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="flex flex-col">
                    <span>{user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user.mobile}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === "admin" || user.role === "staff" ? (
                    <DropdownMenuItem asChild>
                      <a href="/admin"><User className="size-4" />Admin Panel</a>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={() => authStore.logout()}><LogOut className="size-4" />{t("common.logout", "Logout")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" className="hidden rounded-full sm:inline-flex" onClick={() => openAuth("login")}>
                <User className="size-4" />{t("auth.login", "Login")}
              </Button>
            )}
            {user?.role !== "admin" ? <CartSheet /> : null}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu"><Menu className="size-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(20rem,100vw)]">
                <SheetTitle>Store menu</SheetTitle>
                <nav className="mt-5 flex flex-col gap-1">
                  {storefrontNav.map((item) => (
                    <a key={item.label} href={item.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                      {t(`storefront.nav.${item.label.toLowerCase()}`, item.label)}
                    </a>
                  ))}
                  {!user ? (
                    <button type="button" onClick={() => { setOpen(false); openAuth("login"); }} className="rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted">
                      {t("auth.login", "Login")}
                    </button>
                  ) : null}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-7xl px-3 pb-3 sm:px-4">
          <SearchBox mobile />
        </div>
      </div>

      <nav className="hidden border-b border-border bg-background/95 backdrop-blur lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-6">
          {storefrontNav.map((item) => (
            <a key={item.label} href={item.to} className="px-3.5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              {t(`storefront.nav.${item.label.toLowerCase()}`, item.label)}
            </a>
          ))}
        </div>
      </nav>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} mode={authMode} onModeChange={setAuthMode} />
    </header>
  );
}

function SearchBox({ mobile = false }: { mobile?: boolean }) {
  const searchQuery = useStorefrontFilters((s) => s.searchQuery);

  return (
    <div className={mobile ? "w-full" : "ml-4 hidden min-w-0 flex-1 lg:block"}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={mobile ? "mobile-header-search" : undefined}
          value={searchQuery}
          onChange={(event) => storefrontFilterStore.setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && searchQuery.trim()) {
              document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          placeholder="Search products, categories, variants…"
          className="h-11 rounded-full bg-muted pl-10 pr-10"
          aria-label="Search products"
        />
        {searchQuery ? (
          <button type="button" aria-label="Clear search" onClick={() => storefrontFilterStore.setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground">
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
