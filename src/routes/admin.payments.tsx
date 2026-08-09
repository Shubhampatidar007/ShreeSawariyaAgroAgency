import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Wallet, WalletCards } from "lucide-react";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatCurrency, formatDate, useShopStore } from "@/lib/shop-store";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Admin" },
      { name: "description", content: "Customer and supplier payments with method filters and status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentsPage,
});

const methods = ["all", "cash", "credit", "upi", "card", "bank", "cheque", "online"];

function PaymentsPage() {
  const { t } = useI18n();
  const payments = useShopStore((s) => s.payments);
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("all");
  const [direction, setDirection] = useState("all");

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        const q = query.trim().toLowerCase();
        const matchQuery =
          !q || `${p.partyName} ${p.reference} ${p.orderCode ?? ""}`.toLowerCase().includes(q);
        const matchMethod = method === "all" || p.method === method;
        const matchDirection = direction === "all" || p.direction === direction;
        return matchQuery && matchMethod && matchDirection;
      }),
    [payments, query, method, direction],
  );

  const incoming = payments.filter((p) => p.direction === "incoming");
  const outgoing = payments.filter((p) => p.direction === "outgoing");
  const sum = (list: typeof payments) => list.reduce((total, p) => total + p.amount, 0);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: t("common.admin"), to: "/admin" }, { label: t("common.payments") }]}
        eyebrow={t("common.moneyMovement")}
        title={t("payments.title")}
        description={t("payments.description")}
        actions={<ExportMenu />}
      />

      <SummaryCards
        items={[
          { label: t("payments.received"), value: formatCurrency(sum(incoming)), icon: ArrowDownLeft, tone: "success" },
          { label: t("payments.paidOut"), value: formatCurrency(sum(outgoing)), icon: ArrowUpRight, tone: "warning" },
          {
            label: t("payments.pending"),
            value: formatCurrency(sum(payments.filter((p) => p.status === "pending"))),
            icon: Wallet,
            tone: "warning",
          },
          { label: "Transactions", value: String(payments.length), icon: WalletCards },
        ]}
      />

      <Tabs value={direction} onValueChange={setDirection}>
        <TabsList>
          <TabsTrigger value="all">{t("payments.all")}</TabsTrigger>
          <TabsTrigger value="incoming">{t("payments.customerReceipts")}</TabsTrigger>
          <TabsTrigger value="outgoing">{t("payments.supplierPayouts")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <SearchToolbar value={query} onChange={setQuery} placeholder="Search reference, party, order…">
        {methods.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMethod(item)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors ${
              method === item
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {item}
          </button>
        ))}
      </SearchToolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t("payments.noPayments")}
          description={t("payments.noPaymentsDescription")}
        />
      ) : (
        <Card className="overflow-hidden shadow-soft">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("payments.reference")}</TableHead>
                    <TableHead>{t("payments.party")}</TableHead>
                    <TableHead>{t("payments.date")}</TableHead>
                    <TableHead>{t("payments.type")}</TableHead>
                    <TableHead>{t("payments.method")}</TableHead>
                    <TableHead className="text-right">{t("payments.amount")}</TableHead>
                    <TableHead>{t("payments.status")}</TableHead>
                    <TableHead>{t("payments.remarks")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.reference}</TableCell>
                      <TableCell>
                        <p className="font-medium">{payment.partyName}</p>
                        <p className="text-xs text-muted-foreground">{payment.orderCode ?? "—"}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(payment.date)}</TableCell>
                      <TableCell className="capitalize">{payment.direction}</TableCell>
                      <TableCell className="uppercase text-muted-foreground">{payment.method}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status === "success" ? "paid" : payment.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{payment.remarks ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
