import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Boxes,
  Clock,
  FileBarChart,
  LayoutDashboard,
  Package,
  Plus,
  ReceiptText,
  Settings,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useShopStore } from "@/lib/shop-store";
import { useI18n } from "@/lib/i18n";

const RECENTS_KEY = "agrikisan-recent-searches";

const pages = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Suppliers", to: "/admin/suppliers", icon: Truck },
  { label: "Inventory", to: "/admin/inventory", icon: Boxes },
  { label: "Products", to: "/admin/products", icon: Package },
  { label: "Orders & Sales", to: "/admin/sales", icon: ReceiptText },
  { label: "Payments", to: "/admin/payments", icon: Wallet },
  { label: "Reports", to: "/admin/reports", icon: FileBarChart },
  { label: "Analytics", to: "/admin/analytics", icon: FileBarChart },
  { label: "Reminders", to: "/admin/reminders", icon: Clock },
  { label: "Homepage CMS", to: "/admin/cms", icon: BookOpen },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

const quickActions = [
  { label: "New offline sale", to: "/admin/sales" },
  { label: "Add customer", to: "/admin/customers/new" },
  { label: "New stock entry", to: "/admin/inventory/new" },
  { label: "Publish product", to: "/admin/products/publish" },
];

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<string[]>([]);

  const customers = useShopStore((s) => s.customers);
  const suppliers = useShopStore((s) => s.suppliers);
  const inventory = useShopStore((s) => s.inventory);
  const products = useShopStore((s) => s.products);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENTS_KEY);
      if (raw) setRecents(JSON.parse(raw) as string[]);
    } catch {
      setRecents([]);
    }
  }, [open]);

  const go = useCallback(
    (to: string, term: string) => {
      const next = [term, ...recents.filter((r) => r !== term)].slice(0, 6);
      setRecents(next);
      try {
        window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      onOpenChange(false);
      setQuery("");
      void navigate({ to } as never);
    },
    [navigate, onOpenChange, recents],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const limit = <T,>(list: T[]) => list.slice(0, 5);
    if (!q) return { customers: [], suppliers: [], inventory: [], products: [] };
    return {
      customers: limit(
        customers.filter((c) => `${c.name} ${c.mobile} ${c.village}`.toLowerCase().includes(q)),
      ),
      suppliers: limit(
        suppliers.filter((s) => `${s.company} ${s.name} ${s.mobile}`.toLowerCase().includes(q)),
      ),
      inventory: limit(
        inventory.filter((i) => `${i.productName} ${i.supplierName}`.toLowerCase().includes(q)),
      ),
      products: limit(products.filter((p) => `${p.title} ${p.category}`.toLowerCase().includes(q))),
    };
  }, [query, customers, suppliers, inventory, products]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={t("common.searchPlaceholder")}
      />
      <CommandList>
        <CommandEmpty>{t("common.noResults")}</CommandEmpty>

        {!query && recents.length > 0 ? (
          <>
            <CommandGroup heading="Recent searches">
              {recents.map((term) => (
                <CommandItem key={term} value={term} onSelect={() => setQuery(term)}>
                  <Clock className="size-4" /> {term}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        ) : null}

        <CommandGroup heading={t("common.quickActions")}>
          {quickActions.map((action) => (
            <CommandItem
              key={action.to}
              value={action.label}
              onSelect={() => go(action.to, action.label)}
            >
              <Plus className="size-4" /> {action.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem key={page.to} value={page.label} onSelect={() => go(page.to, page.label)}>
              <page.icon className="size-4" /> {page.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {matches.customers.length > 0 ? (
          <CommandGroup heading="Customers">
            {matches.customers.map((c) => (
              <CommandItem
                key={c.id}
                value={`customer-${c.name}`}
                onSelect={() => go(`/admin/customers/${c.id}`, c.name)}
              >
                <Users className="size-4" /> {c.name}
                <span className="ml-auto text-xs text-muted-foreground">{c.village}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {matches.suppliers.length > 0 ? (
          <CommandGroup heading="Suppliers">
            {matches.suppliers.map((s) => (
              <CommandItem
                key={s.id}
                value={`supplier-${s.company}`}
                onSelect={() => go(`/admin/suppliers/${s.id}`, s.company)}
              >
                <Truck className="size-4" /> {s.company}
                <span className="ml-auto text-xs text-muted-foreground">{s.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {matches.inventory.length > 0 ? (
          <CommandGroup heading="Inventory">
            {matches.inventory.map((i) => (
              <CommandItem
                key={i.id}
                value={`inventory-${i.productName}`}
                onSelect={() => go("/admin/inventory", i.productName)}
              >
                <Boxes className="size-4" /> {i.productName}
                <span className="ml-auto text-xs text-muted-foreground">
                  {i.quantity} {i.unit}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {matches.products.length > 0 ? (
          <CommandGroup heading="Products">
            {matches.products.map((p) => (
              <CommandItem
                key={p.id}
                value={`product-${p.title}`}
                onSelect={() => go("/admin/products", p.title)}
              >
                <Package className="size-4" /> {p.title}
                <span className="ml-auto text-xs text-muted-foreground">{p.category}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
