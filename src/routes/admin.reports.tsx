import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { buildDailyMetrics, dateInRange } from "@/lib/business-metrics";
import { formatCurrency, formatDate, useShopStore } from "@/lib/shop-store";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Export — Admin" },
      {
        name: "description",
        content: "Live customer, supplier, inventory, sales and profit reports.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
});

type ReportKey = "sales" | "customers" | "suppliers" | "inventory" | "payments" | "dues" | "profit";

function ReportsPage() {
  const { t } = useI18n();
  const store = useShopStore((s) => s);
  const [report, setReport] = useState<ReportKey>("sales");
  const [range, setRange] = useState<DateRangeKey>("monthly");
  const [custom, setCustom] = useState<CustomRange>({ from: "", to: "" });
  const [query, setQuery] = useState("");

  const metricRange = range;
  const metrics = useMemo(
    () =>
      buildDailyMetrics(
        store.orders,
        store.customerLedger,
        store.supplierLedger,
        store.inventory,
        metricRange,
        custom,
      ),
    [
      store.orders,
      store.customerLedger,
      store.supplierLedger,
      store.inventory,
      metricRange,
      custom,
    ],
  );
  const totals = useMemo(
    () => ({
      sales: metrics.reduce((sum, row) => sum + row.sales, 0),
      purchases: metrics.reduce((sum, row) => sum + row.purchases, 0),
      customerDue: store.customers.reduce((sum, customer) => sum + customer.currentDue, 0),
      supplierDue: store.suppliers.reduce((sum, supplier) => sum + supplier.dueBalance, 0),
      profit: metrics.reduce((sum, row) => sum + row.profit, 0),
    }),
    [metrics, store.customers, store.suppliers],
  );

  const q = query.trim().toLowerCase();
  const match = (value: string) => !q || value.toLowerCase().includes(q);
  const inSelectedRange = (value: string) => dateInRange(value, range, custom);

  const salesRows = useMemo(() => {
    const orderRows = store.orders
      .filter(
        (order) => inSelectedRange(order.placedOn) && match(`${order.code} ${order.customerName}`),
      )
      .map((order) => [
        order.code,
        order.customerName,
        formatDate(order.placedOn),
        formatCurrency(order.total),
        formatCurrency(order.paid),
        <StatusBadge key={order.id} status={order.paymentStatus} />,
      ]);
    const khataRows = store.customerLedger
      .filter(
        (entry) =>
          (entry.entryType as string) === "sale" &&
          inSelectedRange(entry.date) &&
          match(`${entry.product} ${entry.customerId}`),
      )
      .map((entry) => [
        `KHATA-${entry.id.slice(0, 8)}`,
        entry.customerId,
        formatDate(entry.date),
        formatCurrency(entry.amount),
        formatCurrency(entry.payment),
        <StatusBadge key={entry.id} status={entry.payment > 0 ? "partial" : "pending"} />,
      ]);
    return [...orderRows, ...khataRows];
  }, [store.orders, store.customerLedger, range, custom, q]);

  const reportTabs: { key: ReportKey; label: string }[] = [
    { key: "sales", label: t("reports.salesOrders") },
    { key: "customers", label: t("reports.customers") },
    { key: "suppliers", label: t("reports.suppliers") },
    { key: "inventory", label: t("reports.inventory") },
    { key: "payments", label: t("reports.payments") },
    { key: "dues", label: t("reports.dues") },
    { key: "profit", label: t("reports.profitLoss") },
  ];

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: t("common.admin"), to: "/admin" }, { label: t("common.reports") }]}
        eyebrow={t("common.insights")}
        title={t("reports.title")}
        description="Live reports built from the same Supabase data powering Overview."
        actions={<ExportMenu />}
      />

      <SummaryCards
        items={[
          {
            label: t("reports.totalSales"),
            value: formatCurrency(totals.sales),
            icon: IndianRupee,
            tone: "success",
          },
          {
            label: t("reports.totalPurchases"),
            value: formatCurrency(totals.purchases),
            icon: Layers,
          },
          {
            label: t("reports.customerDues"),
            value: formatCurrency(totals.customerDue),
            icon: Users,
            tone: "warning",
          },
          {
            label: t("reports.supplierDues"),
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

      <SearchToolbar value={query} onChange={setQuery} placeholder={t("reports.placeholder")} />

      <Card className="shadow-soft">
        <CardContent className="overflow-x-auto p-0">
          {report === "sales" && (
            <ReportTable
              headers={[
                t("reports.order"),
                t("reports.customer"),
                t("reports.date"),
                t("reports.amount"),
                t("reports.paid"),
                t("reports.status"),
              ]}
              rows={salesRows}
            />
          )}
          {report === "customers" && (
            <ReportTable
              headers={[
                t("reports.customer"),
                t("reports.village"),
                t("reports.purchases"),
                t("reports.paid"),
                t("reports.due"),
                t("reports.status"),
              ]}
              rows={store.customers
                .filter((c) => match(`${c.name} ${c.village}`))
                .map((c) => [
                  <Link
                    key={c.id}
                    to="/admin/customers/$customerId"
                    params={{ customerId: c.id }}
                    className="font-medium text-primary hover:underline"
                  >
                    {c.name}
                  </Link>,
                  c.village,
                  formatCurrency(c.totalPurchases),
                  formatCurrency(c.totalPaid),
                  formatCurrency(c.currentDue),
                  <StatusBadge key={`status-${c.id}`} status={c.status} />,
                ])}
            />
          )}
          {report === "suppliers" && (
            <ReportTable
              headers={[
                t("reports.supplier"),
                t("reports.company"),
                t("reports.purchases"),
                t("reports.paid"),
                t("reports.due"),
                t("reports.status"),
              ]}
              rows={store.suppliers
                .filter((s) => match(`${s.name} ${s.company}`))
                .map((s) => [
                  <Link
                    key={s.id}
                    to="/admin/ledger/suppliers/$supplierId"
                    params={{ supplierId: s.id }}
                    className="font-medium text-primary hover:underline"
                  >
                    {s.name}
                  </Link>,
                  <Link
                    key={`company-${s.id}`}
                    to="/admin/ledger/suppliers/$supplierId"
                    params={{ supplierId: s.id }}
                    className="hover:underline"
                  >
                    {s.company}
                  </Link>,
                  formatCurrency(s.totalPurchases),
                  formatCurrency(s.totalPaid),
                  formatCurrency(s.dueBalance),
                  <StatusBadge key={`status-${s.id}`} status={s.status} />,
                ])}
            />
          )}
          {report === "inventory" && (
            <ReportTable
              headers={[
                t("reports.product"),
                t("reports.supplier"),
                t("reports.qty"),
                t("reports.purchasePrice"),
                t("reports.stockValue"),
                t("reports.status"),
              ]}
              rows={store.inventory
                .filter((i) => match(`${i.productName} ${i.supplierName}`))
                .map((i) => [
                  <Link
                    key={i.id}
                    to="/admin/inventory/"
                    className="font-medium text-primary hover:underline"
                  >
                    {i.productName}
                  </Link>,
                  <Link key={`supplier-${i.id}`} to="/admin/inventory/" className="hover:underline">
                    {i.supplierName}
                  </Link>,
                  `${i.quantity} ${i.unit}`,
                  formatCurrency(i.purchasePrice),
                  formatCurrency(i.quantity * i.purchasePrice),
                  <StatusBadge key={`status-${i.id}`} status={i.status} />,
                ])}
            />
          )}
          {report === "payments" && (
            <ReportTable
              headers={[
                t("reports.reference"),
                t("reports.party"),
                t("reports.date"),
                t("reports.method"),
                t("reports.amount"),
                t("reports.status"),
              ]}
              rows={store.payments
                .filter((p) => inSelectedRange(p.date) && match(`${p.reference} ${p.partyName}`))
                .map((p) => [
                  p.reference,
                  p.partyName,
                  formatDate(p.date),
                  p.method.toUpperCase(),
                  formatCurrency(p.amount),
                  <StatusBadge key={p.id} status={p.status === "success" ? "paid" : p.status} />,
                ])}
            />
          )}
          {report === "dues" && (
            <ReportTable
              headers={[
                t("reports.party"),
                t("reports.type"),
                t("reports.outstanding"),
                t("reports.lastActivity"),
              ]}
              rows={[
                ...store.customers
                  .filter((c) => c.currentDue > 0 && match(c.name))
                  .map((c) => [
                    <Link
                      key={`customer-${c.id}`}
                      to="/admin/customers/$customerId"
                      params={{ customerId: c.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.name}
                    </Link>,
                    "Customer",
                    formatCurrency(c.currentDue),
                    formatDate(c.lastPurchase),
                  ]),
                ...store.suppliers
                  .filter((s) => s.dueBalance > 0 && match(s.name))
                  .map((s) => [
                    <Link
                      key={`supplier-${s.id}`}
                      to="/admin/ledger/suppliers/$supplierId"
                      params={{ supplierId: s.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {s.name}
                    </Link>,
                    "Supplier",
                    formatCurrency(s.dueBalance),
                    formatDate(s.lastOrder),
                  ]),
              ]}
            />
          )}
          {report === "profit" && (
            <ReportTable
              headers={[t("reports.metric"), t("reports.value")]}
              rows={[
                [t("reports.revenue"), formatCurrency(totals.sales)],
                [
                  t("reports.costGoods"),
                  formatCurrency(metrics.reduce((sum, row) => sum + row.cost, 0)),
                ],
                [t("reports.grossProfit"), formatCurrency(totals.profit)],
                [t("reports.receivables"), formatCurrency(totals.customerDue)],
                [t("reports.payables"), formatCurrency(totals.supplierDue)],
                [
                  t("reports.netPosition"),
                  formatCurrency(totals.profit + totals.customerDue - totals.supplierDue),
                ],
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  const { t } = useI18n();
  if (rows.length === 0)
    return (
      <p className="px-6 py-12 text-center text-sm text-muted-foreground">
        {t("reports.noRecords")}
      </p>
    );
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
