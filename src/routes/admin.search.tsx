import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search as SearchIcon, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { ModulePageHeader as PageHeader } from "@/components/shared/ModulePageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatCurrency, useShopStore } from "@/lib/shop-store";
import { featuredProducts } from "@/data/storefront";

export const Route = createFileRoute("/admin/search")({
  component: AdminSearchPage,
});

const schema = z.object({
  query: z.string().min(2, "Enter at least 2 characters to search"),
});

type SearchValues = z.infer<typeof schema>;

type Result = { id: string; title: string; subtitle: string; type: string };

const suggestions = ["Product", "Invoice", "Customer", "Stock", "Supplier"];

function AdminSearchPage() {
  const [query, setQuery] = useState("");
  const orders = useShopStore((s) => s.orders);

  const form = useForm<SearchValues>({
    resolver: zodResolver(schema),
    defaultValues: { query: "" },
  });

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const productHits: Result[] = featuredProducts
      .filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q))
      .map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: `${p.category} · ₹${p.price.toLocaleString("en-IN")} per ${p.unit}`,
        type: "Product",
      }));

    const billHits: Result[] = orders
      .filter((b) => `${b.code} ${b.customerName} ${b.village}`.toLowerCase().includes(q))
      .map((b) => ({
        id: b.id,
        title: `${b.code} · ${b.customerName || "Walk-in"}`,
        subtitle: `${b.village} · ${formatCurrency(b.total)} · ${b.paymentStatus}`,
        type: "Invoice",
      }));

    return [...productHits, ...billHits];
  }, [query, orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Global"
        title="Search"
        description="Look up products, invoices, customers and stock entries from one place."
      />

      <Card className="shadow-soft">
        <CardContent className="p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => setQuery(values.query))}
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
                          placeholder="Search products, invoices, customers…"
                          className="h-11 rounded-full pl-9"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="rounded-full">
                Search
              </Button>
            </form>
          </Form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Try:</span>
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
          description="Search covers the product catalogue and recent counter bills in Phase 1. Customer khata and supplier records join later."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={`No matches for “${query}”`}
          description="Check the spelling, or search using an invoice number, product name or village."
        />
      ) : (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">
              {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((result) => (
              <div
                key={`${result.type}-${result.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4"
              >
                <div>
                  <p className="text-sm font-semibold">{result.title}</p>
                  <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                </div>
                <Badge variant="secondary">{result.type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}