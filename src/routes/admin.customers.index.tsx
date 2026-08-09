import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpDown,
  BookOpen,
  Eye,
  IndianRupee,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { TablePagination } from "@/components/shared/TablePagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CustomerCard } from "@/components/shared/EntityCards";
import { formatCurrency, formatDate, shopStore, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — Admin" },
      { name: "description", content: "Farmer directory with khata dues, purchases and status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomerListPage,
});

const PAGE_SIZE = 8;

function CustomerListPage() {
  const customers = useShopStore((s) => s.customers);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = customers.filter((customer) => {
      const matchesTerm =
        !term ||
        customer.name.toLowerCase().includes(term) ||
        customer.mobile.includes(term) ||
        customer.village.toLowerCase().includes(term);
      const matchesStatus = status === "all" || customer.status === status;
      return matchesTerm && matchesStatus;
    });

    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "due") return b.currentDue - a.currentDue;
      if (sort === "purchases") return b.totalPurchases - a.totalPurchases;
      return b.lastPurchase.localeCompare(a.lastPurchase);
    });
  }, [customers, query, status, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totals = useMemo(
    () => ({
      count: customers.length,
      active: customers.filter((c) => c.status === "active").length,
      purchases: customers.reduce((sum, c) => sum + c.totalPurchases, 0),
      due: customers.reduce((sum, c) => sum + c.currentDue, 0),
    }),
    [customers],
  );

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Customers" }]}
        eyebrow="Module"
        title="Customers"
        description="Farmer profiles, village mapping, purchase history and khata dues."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/admin/customers/new">
              <Plus className="size-4" /> Add customer
            </Link>
          </Button>
        }
      />

      <SummaryCards
        items={[
          { label: "Total customers", value: String(totals.count), icon: Users, helper: "Across all villages" },
          { label: "Active", value: String(totals.active), icon: UserCheck, tone: "success", helper: "Bought in last 6 months" },
          { label: "Lifetime purchases", value: formatCurrency(totals.purchases), icon: IndianRupee },
          { label: "Outstanding due", value: formatCurrency(totals.due), icon: Wallet, tone: "warning" },
        ]}
      />

      <SearchToolbar
        value={query}
        onChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        placeholder="Search by name, mobile or village…"
      >
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px] rounded-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[180px] rounded-full">
            <ArrowUpDown className="size-3.5" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recent purchase</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="due">Highest due</SelectItem>
            <SelectItem value="purchases">Highest purchases</SelectItem>
          </SelectContent>
        </Select>
      </SearchToolbar>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Try a different search term or filter, or add a new farmer to your khata book."
          action={
            <Button className="rounded-full" asChild>
              <Link to="/admin/customers/new">Add customer</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {rows.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
          </div>

          <Card className="hidden overflow-hidden shadow-soft lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Last purchase</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link
                        to="/admin/customers/$customerId"
                        params={{ customerId: customer.id }}
                        className="hover:text-primary"
                      >
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{customer.mobile}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {customer.address}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.totalPurchases)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.totalPaid)}</TableCell>
                    <TableCell
                      className={`text-right font-semibold ${customer.currentDue > 0 ? "text-destructive" : "text-success"}`}
                    >
                      {formatCurrency(customer.currentDue)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(customer.lastPurchase)}</TableCell>
                    <TableCell>
                      <StatusBadge status={customer.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild aria-label="View customer">
                          <Link to="/admin/customers/$customerId" params={{ customerId: customer.id }}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild aria-label="Edit customer">
                          <Link
                            to="/admin/customers/$customerId/edit"
                            params={{ customerId: customer.id }}
                          >
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild aria-label="Open khata">
                          <Link to="/admin/khata/customers/$customerId" params={{ customerId: customer.id }}>
                            <BookOpen className="size-4" />
                          </Link>
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Delete customer">
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          }
                          title={`Delete ${customer.name}?`}
                          description="This removes the customer and their khata records from this view. This action cannot be undone."
                          confirmLabel="Delete"
                          onConfirm={() => shopStore.deleteCustomer(customer.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <TablePagination
            page={currentPage}
            pageCount={pageCount}
            total={filtered.length}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}