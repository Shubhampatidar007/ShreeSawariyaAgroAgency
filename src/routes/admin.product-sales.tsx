import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  Search,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { TablePagination } from "@/components/shared/TablePagination";
import { extractErrorMessage } from "@/lib/error-extract";
import { shopStore, useShopStore, formatCurrency, formatDate } from "@/lib/shop-store";
import type { MostSoldProduct, ProductSaleSearchRow } from "@/types/business";

export const Route = createFileRoute("/admin/product-sales")({
  head: () => ({
    meta: [
      { title: "Product Sales History — Admin" },
      {
        name: "description",
        content: "Search historical product sales by product, date, rate and quantity.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProductSalesPage,
});

type SortBy = "date" | "amount" | "customer_name";
type SortDir = "asc" | "desc";

type Filters = {
  product: string;
  dateFrom: string;
  dateTo: string;
  rate: string;
  quantity: string;
};

const initialFilters: Filters = {
  product: "",
  dateFrom: "",
  dateTo: "",
  rate: "",
  quantity: "",
};

function ProductSalesPage() {
  const customers = useShopStore((s) => s.customers);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [rows, setRows] = useState<ProductSaleSearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostSold, setMostSold] = useState<MostSoldProduct[]>([]);
  const [showMostSold, setShowMostSold] = useState(false);

  // Build village dropdown from customers (used as an additional filter
  // if the user wants to narrow by village — but the search RPC supports
  // product, date, rate, quantity; village filter is client-side below).
  const villages = useMemo(
    () => Array.from(new Set(customers.map((c) => c.village).filter(Boolean))).sort(),
    [customers],
  );

  const totalCount = rows.length > 0 ? Number(rows[0].totalCount ?? 0) : 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / 25));

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await shopStore.searchProductSales({
        product: filters.product.trim() || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        rate: filters.rate ? Number(filters.rate) : undefined,
        quantity: filters.quantity ? Number(filters.quantity) : undefined,
        page,
        pageSize: 25,
        sortBy,
        sortDir,
      });
      setRows(result);
    } catch (err) {
      setError(extractErrorMessage(err, "Search failed."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page, sortBy, sortDir]);

  const runMostSold = useCallback(async () => {
    try {
      const result = await shopStore.aggregateMostSoldProducts({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        limit: 5,
      });
      setMostSold(result);
    } catch (err) {
      console.error("Most sold aggregation failed", err);
    }
  }, [filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  useEffect(() => {
    if (showMostSold) void runMostSold();
  }, [showMostSold, runMostSold]);

  function applyFilters() {
    setPage(1);
    void runSearch();
  }

  function resetFilters() {
    setFilters(initialFilters);
    setPage(1);
  }

  function toggleSort(column: SortBy) {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  }

  function exportCsv() {
    if (rows.length === 0) return;
    const headers = [
      "Date",
      "Customer",
      "Mobile",
      "Village",
      "Product",
      "Quantity",
      "Unit",
      "Rate",
      "Item amount",
      "Transaction total",
      "Paid",
      "Outstanding due",
      "Remarks",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.entryDate,
          `"${r.customerName.replace(/"/g, '""')}"`,
          r.customerMobile,
          `"${r.customerVillage.replace(/"/g, '""')}"`,
          `"${r.product.replace(/"/g, '""')}"`,
          r.quantity,
          r.unit,
          r.rate,
          r.itemAmount,
          r.transactionAmount,
          r.transactionPayment,
          r.transactionRemainingDue,
          `"${(r.transactionRemarks ?? "").replace(/"/g, '""')}"`,
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `product-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Product Sales History" }]}
        eyebrow="Sales insights"
        title="Product Sales History"
        description="Search historical product sales by product, date, selling rate, and quantity. Includes a Most Sold Products summary for the selected period."
        actions={
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive sm:text-sm">
          {error}
        </div>
      ) : null}

      {/* Filters card */}
      <Card className="shadow-soft">
        <CardHeader className="py-3 sm:py-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() => setShowFilters((v) => !v)}
          >
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Filter className="size-4" />
              Filters
            </CardTitle>
          </button>
        </CardHeader>
        {showFilters ? (
          <CardContent className="space-y-3 pt-0">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="relative col-span-2 sm:col-span-3 lg:col-span-2">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  className="h-9 pl-8 text-sm"
                  placeholder="Product name (e.g. Urea, Wheat)"
                  value={filters.product}
                  onChange={(e) => setFilters({ ...filters, product: e.target.value })}
                />
              </div>
              <Input
                type="date"
                className="h-9 text-sm"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
              <Input
                type="date"
                className="h-9 text-sm"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-9 text-sm"
                placeholder="Rate (₹)"
                value={filters.rate}
                onChange={(e) => setFilters({ ...filters, rate: e.target.value })}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-9 text-sm"
                placeholder="Quantity"
                value={filters.quantity}
                onChange={(e) => setFilters({ ...filters, quantity: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="rounded-full" onClick={applyFilters} disabled={loading}>
                <Search className="size-3.5" />
                {loading ? "Searching…" : "Search"}
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={resetFilters}>
                Reset
              </Button>
              <Button
                size="sm"
                variant={showMostSold ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setShowMostSold((v) => !v)}
              >
                <TrendingUp className="size-3.5" />
                Most Sold
              </Button>
              <p className="ml-auto self-center text-xs text-muted-foreground">
                {villages.length} villages on file
              </p>
            </div>
          </CardContent>
        ) : null}
      </Card>

      {/* Most Sold summary card (optional) */}
      {showMostSold ? (
        <Card className="shadow-soft">
          <CardHeader className="py-3 sm:py-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <BarChart3 className="size-4" />
              Most Sold Products
              <span className="text-xs font-normal text-muted-foreground">
                {filters.dateFrom || filters.dateTo ? "for selected period" : "all time"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {mostSold.length === 0 ? (
              <p className="text-xs text-muted-foreground sm:text-sm">
                No sales recorded in the selected period.
              </p>
            ) : (
              <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {mostSold.map((p, idx) => (
                  <li key={p.product} className="rounded-lg border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        <span className="text-muted-foreground">#{idx + 1}</span> {p.product}
                      </p>
                      <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                        {p.transactionCount} txn{p.transactionCount === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-[9px] uppercase text-muted-foreground">Quantity</p>
                        <p className="mt-0.5 font-semibold">
                          {Number(p.totalQuantity).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase text-muted-foreground">Amount</p>
                        <p className="mt-0.5 font-semibold">{formatCurrency(p.totalAmount)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Results: desktop table + mobile cards (no horizontal scroll) */}
      <Card className="shadow-soft">
        <CardHeader className="py-3 sm:py-4">
          <CardTitle className="text-sm sm:text-base">
            Results{" "}
            {totalCount > 0 ? (
              <span className="text-muted-foreground">
                · {totalCount} match{totalCount === 1 ? "" : "es"}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground sm:text-sm">
              Loading sales…
            </p>
          ) : rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground sm:text-sm">
              No matching sales. Adjust filters and search again.
            </p>
          ) : (
            <>
              {/* Desktop: sortable table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3">
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={() => toggleSort("date")}
                        >
                          Date {sortBy === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                        </button>
                      </th>
                      <th className="py-2 pr-3">
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={() => toggleSort("customer_name")}
                        >
                          Customer{" "}
                          {sortBy === "customer_name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                        </button>
                      </th>
                      <th className="py-2 pr-3">Product</th>
                      <th className="py-2 pr-3 text-right">Qty</th>
                      <th className="py-2 pr-3 text-right">Rate</th>
                      <th className="py-2 pr-3 text-right">
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={() => toggleSort("amount")}
                        >
                          Item amt {sortBy === "amount" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                        </button>
                      </th>
                      <th className="py-2 pr-3 text-right">Tx total</th>
                      <th className="py-2 pr-3 text-right">Paid</th>
                      <th className="py-2 pr-3 text-right">Due</th>
                      <th className="py-2 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.itemId} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {formatDate(r.entryDate)}
                        </td>
                        <td className="py-2 pr-3">
                          <p className="font-medium">{r.customerName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {r.customerMobile} · {r.customerVillage || "—"}
                          </p>
                        </td>
                        <td className="py-2 pr-3">{r.product}</td>
                        <td className="py-2 pr-3 text-right">
                          {r.quantity} {r.unit}
                        </td>
                        <td className="py-2 pr-3 text-right">{formatCurrency(r.rate)}</td>
                        <td className="py-2 pr-3 text-right font-semibold">
                          {formatCurrency(r.itemAmount)}
                        </td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">
                          {formatCurrency(r.transactionAmount)}
                        </td>
                        <td className="py-2 pr-3 text-right text-success">
                          {formatCurrency(r.transactionPayment)}
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold">
                          {formatCurrency(r.transactionRemainingDue)}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 rounded-full px-2.5 text-[11px]"
                          >
                            <Link
                              to="/admin/khata/customers/$customerId"
                              params={{ customerId: r.customerId }}
                            >
                              View Khata
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: compact cards */}
              <ul className="space-y-2 sm:hidden">
                {rows.map((r) => (
                  <li key={r.itemId} className="rounded-lg border p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{r.product}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(r.entryDate)} · {r.quantity} {r.unit} @{" "}
                          {formatCurrency(r.rate)}
                        </p>
                        <p className="mt-0.5 text-xs">
                          {r.customerName} · {r.customerVillage || "—"}
                        </p>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 rounded-full px-2.5 text-[11px]"
                      >
                        <Link
                          to="/admin/khata/customers/$customerId"
                          params={{ customerId: r.customerId }}
                        >
                          Khata
                        </Link>
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1.5 text-xs">
                      <div className="rounded bg-muted/50 px-2 py-1">
                        <p className="text-[9px] uppercase text-muted-foreground">Item</p>
                        <p className="mt-0.5 font-semibold">{formatCurrency(r.itemAmount)}</p>
                      </div>
                      <div className="rounded bg-muted/50 px-2 py-1">
                        <p className="text-[9px] uppercase text-muted-foreground">Tx total</p>
                        <p className="mt-0.5 font-semibold">
                          {formatCurrency(r.transactionAmount)}
                        </p>
                      </div>
                      <div className="rounded bg-muted/50 px-2 py-1">
                        <p className="text-[9px] uppercase text-muted-foreground">Paid</p>
                        <p className="mt-0.5 font-semibold text-success">
                          {formatCurrency(r.transactionPayment)}
                        </p>
                      </div>
                      <div className="rounded bg-muted/50 px-2 py-1">
                        <p className="text-[9px] uppercase text-muted-foreground">Due</p>
                        <p className="mt-0.5 font-semibold">
                          {formatCurrency(r.transactionRemainingDue)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <TablePagination
                page={page}
                pageCount={pageCount}
                total={totalCount}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
