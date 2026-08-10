import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Boxes,
  Package,
  ReceiptText,
  Search as SearchIcon,
  SearchX,
  Truck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { ModulePageHeader as PageHeader } from "@/components/shared/ModulePageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatCurrency, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/search")({
  component: AdminSearchPage,
});

const schema = z.object({
  query: z.string().min(2, "Enter at least 2 characters to search"),
});

type SearchValues = z.infer<typeof schema>;

type Result = {
  id: string;
  title: string;
  subtitle: string;
  type: "Product" | "Invoice" | "Customer" | "Supplier" | "Stock";
  href?: string;
};

const suggestions = [
  "Product",
  "Invoice",
  "Customer",
  "Stock",
  "Supplier",
];

function AdminSearchPage() {
  const [query, setQuery] = useState("");

  const customers = useShopStore((s) => s.customers);
  const suppliers = useShopStore((s) => s.suppliers);
  const inventory = useShopStore((s) => s.inventory);
  const products = useShopStore((s) => s.products);
  const orders = useShopStore((s) => s.orders);

  const form = useForm<SearchValues>({
    resolver: zodResolver(schema),
    defaultValues: { query: "" },
  });

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();

    if (q.length < 2) return [];

    const limit = <T,>(items: T[]) => items.slice(0, 8);

    const customerHits: Result[] = limit(
      customers.filter((customer) =>
        `${customer.name} ${customer.mobile} ${customer.village}`
          .toLowerCase()
          .includes(q),
      ),
    ).map((customer) => ({
      id: customer.id,
      title: customer.name,
      subtitle: `${customer.mobile} · ${customer.village}`,
      type: "Customer",
      href: `/admin/customers/${customer.id}`,
    }));

    const supplierHits: Result[] = limit(
      suppliers.filter((supplier) =>
        `${supplier.company} ${supplier.name} ${supplier.mobile}`
          .toLowerCase()
          .includes(q),
      ),
    ).map((supplier) => ({
      id: supplier.id,
      title: supplier.company,
      subtitle: `${supplier.name} · ${supplier.mobile}`,
      type: "Supplier",
      href: `/admin/suppliers/${supplier.id}`,
    }));

    const productHits: Result[] = limit(
      products.filter((product) =>
        `${product.title} ${product.category}`
          .toLowerCase()
          .includes(q),
      ),
    ).map((product) => ({
      id: product.id,
      title: product.title,
      subtitle: `${product.category} · ${formatCurrency(product.sellingPrice)}`,
      type: "Product",
      href: "/admin/products",
    }));

    const inventoryHits: Result[] = limit(
      inventory.filter((item) =>
        `${item.productName} ${item.supplierName}`
          .toLowerCase()
          .includes(q),
      ),
    ).map((item) => ({
      id: item.id,
      title: item.productName,
      subtitle: `${item.supplierName} · ${item.quantity} ${item.unit}`,
      type: "Stock",
      href: "/admin/inventory",
    }));

    const orderHits: Result[] = limit(
      orders.filter((order) =>
        `${order.code} ${order.customerName} ${order.village}`
          .toLowerCase()
          .includes(q),
      ),
    ).map((order) => ({
      id: order.id,
      title: `${order.code} · ${order.customerName || "Walk-in"}`,
      subtitle: `${order.village} · ${formatCurrency(order.total)} · ${order.paymentStatus}`,
      type: "Invoice",
      href: "/admin/sales",
    }));

    return [
      ...customerHits,
      ...supplierHits,
      ...productHits,
      ...inventoryHits,
      ...orderHits,
    ];
  }, [
    query,
    customers,
    suppliers,
    inventory,
    products,
    orders,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Global"
        title="Search"
        description="Search customers, suppliers, products, stock and invoices from one place."
      />

      <Card className="shadow-soft">
        <CardContent className="p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                setQuery(values.query),
              )}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                          {...field}
                          placeholder="Search customers, suppliers, products, stock…"
                          className="h-11 rounded-full pl-9"
                        />
                      </div>
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                size="lg"
                className="rounded-full"
              >
                Search
              </Button>
            </form>
          </Form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Try:
            </span>

            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  form.setValue("query", suggestion);
                  setQuery(suggestion);
                }}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {query.trim().length < 2 ? (
        <EmptyState
          icon={SearchIcon}
          title="Start typing to search the shop"
          description="Search customers, suppliers, products, inventory and invoices using the current application data."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={`No matches for “${query}”`}
          description="Check the spelling, or try a customer name, mobile number, supplier, product, stock item or invoice number."
        />
      ) : (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">
              {results.length} result
              {results.length === 1 ? "" : "s"} for “{query}”
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {results.map((result) => {
              const icon =
                result.type === "Customer"
                  ? Users
                  : result.type === "Supplier"
                    ? Truck
                    : result.type === "Product"
                      ? Package
                      : result.type === "Stock"
                        ? Boxes
                        : ReceiptText;

              const Icon = icon;

              const content = (
                <>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="size-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {result.title}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {result.subtitle}
                      </p>
                    </div>
                  </div>

                  <Badge variant="secondary">
                    {result.type}
                  </Badge>
                </>
              );

              return result.href ? (
                <Link
                  key={`${result.type}-${result.id}`}
                  to={result.href}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted"
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={`${result.type}-${result.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4"
                >
                  {content}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}