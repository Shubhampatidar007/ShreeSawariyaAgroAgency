import { Home, LayoutGrid, Search, User, LogOut, ShoppingCart } from "lucide-react";
import { CartSheet } from "@/components/cart/CartSheet";
import { Button } from "@/components/ui/button";
import { useAuth, authStore } from "@/lib/auth-store";
import { useI18n } from "@/lib/i18n";
import { AuthDialog, type AuthMode } from "@/components/auth/AuthDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const focusMobileSearch = () => {
  scrollTo("smart-shopping");
  window.setTimeout(() => document.getElementById("smart-shopping-input")?.focus(), 350);
};

export function MobileCommerceNav() {
  const user = useAuth();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const cartDisabled = user?.role === "admin";

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur md:hidden" aria-label="Mobile commerce navigation">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          <a href="#top" className="flex min-h-12 flex-col items-center justify-center rounded-xl px-1 text-[11px] font-medium text-muted-foreground transition-colors active:bg-muted" aria-label="Home">
            <Home className="size-5" />
            <span className="mt-1">Home</span>
          </a>
          <button type="button" onClick={() => scrollTo("categories")} className="flex min-h-12 flex-col items-center justify-center rounded-xl px-1 text-[11px] font-medium text-muted-foreground transition-colors active:bg-muted" aria-label="Categories">
            <LayoutGrid className="size-5" />
            <span className="mt-1">Categories</span>
          </button>
          <button type="button" onClick={focusMobileSearch} className="flex min-h-12 flex-col items-center justify-center rounded-xl px-1 text-[11px] font-medium text-muted-foreground transition-colors active:bg-muted" aria-label="Search">
            <Search className="size-5" />
            <span className="mt-1">Search</span>
          </button>
          <div className="flex min-h-12 items-center justify-center [&_button]:min-h-12 [&_button]:w-full [&_button]:flex-col [&_button]:gap-0.5 [&_button]:rounded-xl [&_button]:px-1 [&_button]:text-[11px] [&_button]:font-medium [&_button]:text-muted-foreground">
            {cartDisabled ? (
              <Button variant="ghost" disabled className="opacity-50" aria-label="Cart unavailable for admin accounts">
                <ShoppingCart className="size-5" />
                <span>Cart</span>
              </Button>
            ) : <CartSheet mobile />}
          </div>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="min-h-12 w-full flex-col gap-0.5 rounded-xl px-1 text-[11px] font-medium text-muted-foreground">
                  <User className="size-5" />
                  <span className="max-w-[4rem] truncate">{user.name.split(" ")[0] || "Account"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="mb-2 w-56">
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
            <button type="button" onClick={() => { setAuthMode("login"); setAuthOpen(true); }} className="flex min-h-12 flex-col items-center justify-center rounded-xl px-1 text-[11px] font-medium text-muted-foreground transition-colors active:bg-muted" aria-label="Account">
              <User className="size-5" />
              <span className="mt-1">Account</span>
            </button>
          )}
        </div>
      </nav>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} mode={authMode} onModeChange={setAuthMode} />
    </>
  );
}
