import { useMemo } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BookOpen, IndianRupee, MapPin, Pencil, Phone, Receipt, UserX, Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { DetailHeader } from "@/components/shared/DetailHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { Timeline } from "@/components/shared/Timeline";
import { formatCurrency, formatDate, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/customers/$customerId/")({
  head: () => ({
    meta: [
      { title: "Customer Profile — Admin" },
      {
        name: "description",
        content: "Farmer profile with purchases, payments and khata summary.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const customer = useShopStore((s) => s.customers.find((c) => c.id === customerId));
  const ledger = useShopStore((s) => s.customerLedger.filter((e) => e.customerId === customerId));

  const sorted = useMemo(() => {
    return ledger
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => {
        const dateOrder = b.entry.date.localeCompare(a.entry.date);
        return dateOrder !== 0 ? dateOrder : b.index - a.index;
      })
      .map(({ entry }) => entry);
  }, [ledger]);

  if (!customer) {
    return (
      <EmptyState
        icon={UserX}
        title="Customer not found"
        description="This customer may have been deleted. Return to the customer list to continue."
        action={
          <Button className="rounded-full" asChild>
            <Link to="/admin/customers">Back to customers</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <DetailHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Customers", to: "/admin/customers" },
          { label: customer.name },
        ]}
        title={customer.name}
        subtitle={`${customer.village} · Customer since ${formatDate(customer.joinedOn)}`}
        badge={<StatusBadge status={customer.status} />}
        avatar={
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary/10 text-primary">
              {customer.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        }
        actions={
          <>
            <Button variant="outline" className="rounded-full" asChild>
              <Link to="/admin/customers/$customerId/edit" params={{ customerId }}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
            <Button className="rounded-full" asChild>
              <Link to="/admin/khata/customers/$customerId" params={{ customerId }}>
                <BookOpen className="size-4" /> Open khata
              </Link>
            </Button>
          </>
        }
      />

      <SummaryCards
        items={[
          {
            label: "Total purchases",
            value: formatCurrency(customer.totalPurchases),
            icon: IndianRupee,
          },
          {
            label: "Total paid",
            value: formatCurrency(customer.totalPaid),
            icon: Wallet,
            tone: "success",
          },
          {
            label: "Current due",
            value: formatCurrency(customer.currentDue),
            icon: Receipt,
            tone: customer.currentDue > 0 ? "warning" : "success",
          },
          {
            label: "Transactions",
            value: String(ledger.length),
            icon: BookOpen,
            helper: "Khata entries",
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Personal information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <InfoRow icon={Phone} label="Mobile" value={customer.mobile} />
            <Separator />
            <InfoRow icon={MapPin} label="Address" value={customer.address} />
            <Separator />
            <InfoRow icon={BookOpen} label="Village" value={customer.village} />
            {customer.notes ? (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-1 text-sm">{customer.notes}</p>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Transaction timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No khata entries recorded yet.</p>
            ) : (
              <Timeline
                items={sorted.slice(0, 6).map((entry) => ({
                  id: entry.id,
                  title: entry.product,
                  meta: `${formatDate(entry.date)} · ${entry.quantity} unit(s) · ${entry.method.toUpperCase()}`,
                  description:
                    entry.remarks ??
                    `Paid ${formatCurrency(entry.payment)}, due ${formatCurrency(entry.remainingDue)}`,
                  amount: formatCurrency(entry.amount),
                  tone: entry.remainingDue > 0 ? "warning" : "success",
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Purchase &amp; payment history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Payment</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell className="font-medium">{entry.product}</TableCell>
                    <TableCell className="text-right">{entry.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                    <TableCell className="text-right text-success">
                      {formatCurrency(entry.payment)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(entry.remainingDue)}
                    </TableCell>
                    <TableCell className="uppercase text-muted-foreground">
                      {entry.method}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
