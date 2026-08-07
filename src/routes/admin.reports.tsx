import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IndianRupee, Layers, TrendingDown, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { RangeFilter, type CustomRange, type DateRangeKey } from "@/components/shared/RangeFilter";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Export — AgriKisan Admin" },
      {
        name: "description",
        content: "Customer, supplier, inventory, sales and profit reports with export options.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
});

type ReportKey =
  | "sales"
  | "customers"
  | "suppliers"
  | "inventory"
  | "payments"
  | "dues"
  | "profit";

const reportTabs: { key: ReportKey; label: string }[] = [
  { key: "sales", label: "Sales & orders" },
  { key: "customers", label: "Customers" },
  { key: "suppliers", label: "Suppliers" },
  { key: "inventory", label: "Inventory" },
  { key: "payments", label: "Payments" },
  { key: "dues", label: "Dues" },
  { key: "profit", label: "Profit & loss" },
];

function ReportsPage() {
  const store = useShopStore((s) => s);
  const [report, setReport] = useState<ReportKey>("sales");
  const [range, setRange] = useState<DateRangeKey>("monthly");
  const [custom, setCustom] = useState<CustomRange>({ from: "", to: "" });
  const [query, setQuery] = useState("");

  const totals = useMemo(() => {
    const sales = store.orders.reduce((s, o) => s + o.total, 0);
    const purchases = store.inventory.reduce((s, i) => s + i.quantity * i.purchasePrice, 0);
    const customerDue = store.customers.reduce((s, c) => s + c.currentDue, 0);
    const supplierDue = store.suppliers.reduce((s, x) => s + x.dueBalance, 0);
    return { sales, purchases, customerDue, supplierDue };
  }, [store]);

  const q = query.trim().toLowerCase();
  const match = (value: string) => !q || value.toLowerCase().includes(q);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Reports" }]}
        eyebrow="Insights"
        title="Reports & export"
        description="Filterable business reports across sales, stock, parties and payments."
        actions={<ExportMenu />}
      />

      <SummaryCards
        items={[
          { label: "Total sales", value: formatCurrency(totals.sales), icon: IndianRupee, tone: "success" },
          { label: "Total purchases", value: formatCurrency(totals.purchases), icon: Layers },
          { label: "Customer dues", value: formatCurrency(totals.customerDue), icon: Users, tone: "warning" },
          {
            label: "Supplier dues",
            value: formatCurrency(totals.supplierDue),
            icon: TrendingDown,
            tone: "danger",
          },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={report} onValueChange={(value) => setReport(value as ReportKey)}>
          <TabsList className="flex-wrap">
            {reportTabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <RangeFilter value={range} onChange={setRange} custom={custom} onCustomChange={setCustom} />
      </div>

      <SearchToolbar value={query} onChange={setQuery} placeholder="Filter rows…" />

      <Card className="shadow-soft">
        <CardContent className="overflow-x-auto p-0">
          {report === "sales" ? (
            <ReportTable
              headers={["Order", "Customer", "Date", "Amount", "Paid", "Status"]}
              rows={store.orders
                .filter((o) => match(`${o.code} ${o.customerName}`))
                .map((o) => [
                  o.code,
                  o.customerName,
                  formatDate(o.placedOn),
                  formatCurrency(o.total),
                  formatCurrency(o.paid),
                  <StatusBadge key={o.id} status={o.paymentStatus} />,
                ])}
            />
          ) : null}

          {report === "customers" ? (
            <ReportTable
              headers={["Customer", "Village", "Purchases", "Paid", "Due", "Status"]}
              rows={store.customers
                .filter((c) => match(`${c.name} ${c.village}`))
                .map((c) => [
                  c.name,
                  c.village,
                  formatCurrency(c.totalPurchases),
                  formatCurrency(c.totalPaid),
                  formatCurrency(c.currentDue),
                  <StatusBadge key={c.id} status={c.status} />,
                ])}
            />
          ) : null}

          {report === "suppliers" ? (
            <ReportTable
              headers={["Supplier", "Company", "Purchases", "Paid", "Due", "Status"]}
              rows={store.suppliers
                .filter((s) => match(`${s.name} ${s.company}`))
                .map((s) => [
                  s.name,
                  s.company,
                  formatCurrency(s.totalPurchases),
                  formatCurrency(s.totalPaid),
                  formatCurrency(s.dueBalance),
                  <StatusBadge key={s.id} status={s.status} />,
                ])}
            />
          ) : null}

          {report === "inventory" ? (
            <ReportTable
              headers={["Product", "Supplier", "Qty", "Purchase price", "Stock value", "Status"]}
              rows={store.inventory
                .filter((i) => match(`${i.productName} ${i.supplierName}`))
                .map((i) => [
                  i.productName,
                  i.supplierName,
                  `${i.quantity} ${i.unit}`,
                  formatCurrency(i.purchasePrice),
                  formatCurrency(i.quantity * i.purchasePrice),
                  <StatusBadge key={i.id} status={i.status} />,
                ])}
            />
          ) : null}

          {report === "payments" ? (
            <ReportTable
              headers={["Reference", "Party", "Date", "Method", "Amount", "Status"]}
              rows={store.payments
                .filter((p) => match(`${p.reference} ${p.partyName}`))
                .map((p) => [
                  p.reference,
                  p.partyName,
                  formatDate(p.date),
                  p.method.toUpperCase(),
                  formatCurrency(p.amount),
                  <StatusBadge key={p.id} status={p.status === "success" ? "paid" : p.status} />,
                ])}
            />
          ) : null}

          {report === "dues" ? (
            <ReportTable
              headers={["Party", "Type", "Outstanding", "Last activity"]}
              rows={[
                ...store.customers
                  .filter((c) => c.currentDue > 0 && match(c.name))
                  .map((c) => [c.name, "Customer", formatCurrency(c.currentDue), formatDate(c.lastPurchase)]),
                ...store.suppliers
                  .filter((s) => s.dueBalance > 0 && match(s.name))
                  .map((s) => [s.name, "Supplier", formatCurrency(s.dueBalance), formatDate(s.lastOrder)]),
              ]}
            />
          ) : null}

          {report === "profit" ? (
            <ReportTable
              headers={["Metric", "Value"]}
              rows={[
                ["Revenue", formatCurrency(totals.sales)],
                ["Cost of goods (stock purchased)", formatCurrency(totals.purchases)],
                ["Gross profit", formatCurrency(totals.sales - totals.purchases)],
                ["Receivables", formatCurrency(totals.customerDue)],
                ["Payables", formatCurrency(totals.supplierDue)],
                [
                  "Net position",
                  formatCurrency(totals.sales - totals.purchases + totals.customerDue - totals.supplierDue),
                ],
              ]}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  if (rows.length === 0) {
    return (
      <p className="px-6 py-12 text-center text-sm text-muted-foreground">
        No records for the selected filters.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((header) => (
            <TableHead key={header}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={index}>
            {row.map((cell, cellIndex) => (
              <TableCell key={cellIndex}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
