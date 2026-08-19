import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BellRing,
  CheckCircle2,
  Eye,
  Filter,
  History,
  MapPin,
  Search,
  Send,
  Smartphone,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { formatCurrency, formatDate, shopStore, useShopStore } from "@/lib/shop-store";
import {
  sendWhatsAppBatch,
  type WhatsAppMessageKind,
  type WhatsAppRecipient,
} from "@/lib/whatsapp";
import type { Customer, CustomerLedgerEntry, CustomerSaleItem } from "@/types/business";

const messagePresets: Record<WhatsAppMessageKind, { label: string; message: string }> = {
  "due-reminder": {
    label: "Due reminder",
    message:
      "Hello {name},\n\nThis is a quick account update from Shree Sawariya Agro Agency.\n\nCurrent outstanding: {due}\n\nIf you have already made the payment, please ignore this message or contact us for confirmation.\n\nThank you,\nShree Sawariya Agro Agency",
  },

  "purchase-summary": {
    label: "Total amount record",
    message:
      "Hello {name},\n\nHere is your account summary from Shree Sawariya Agro Agency:\n\nTotal purchases: {totalPurchase}\nTotal paid: {totalPaid}\nCurrent due: {due}\nLast purchase: {lastPurchase}\n\nFor any clarification, please contact us.\n\nThank you,\nShree Sawariya Agro Agency",
  },

  custom: {
    label: "Custom message",
    message: "Hello {name},\n\nWrite your message here.\n\n— Shree Sawariya Agro Agency",
  },
};
type FilterState = {
  query: string;
  village: string;
  minDue: string;
  maxDue: string;
  minPurchase: string;
  maxPurchase: string;
  purchaseFrom: string;
  purchaseTo: string;
  dueOnly: boolean;
  whatsappOnly: boolean;
};

const initialFilters: FilterState = {
  query: "",
  village: "all",
  minDue: "",
  maxDue: "",
  minPurchase: "",
  maxPurchase: "",
  purchaseFrom: "",
  purchaseTo: "",
  dueOnly: true,
  whatsappOnly: true,
};

export const Route = createFileRoute("/admin/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders & WhatsApp — Admin" },
      {
        name: "description",
        content: "Preview customer purchase records and filter customers for WhatsApp reminders.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RemindersPage,
});

function RemindersPage() {
  const customers = useShopStore((s) => s.customers);
  const ledger = useShopStore((s) => s.customerLedger);
  const logs = useShopStore((s) => s.reminderLogs);

  const [kind, setKind] = useState<WhatsAppMessageKind>("due-reminder");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewCustomer, setPreviewCustomer] = useState<Customer | null>(null);
  const [message, setMessage] = useState(messagePresets["due-reminder"].message);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState("send");

  const villages = useMemo(
    () => Array.from(new Set(customers.map((customer) => customer.village).filter(Boolean))).sort(),
    [customers],
  );

  const recipients = useMemo<WhatsAppRecipient[]>(
    () =>
      customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        due: customer.currentDue,
        village: customer.village,
        lastPurchase: customer.lastPurchase,
      })),
    [customers],
  );

  const filteredCustomers = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const minDue = filters.minDue === "" ? Number.NEGATIVE_INFINITY : Number(filters.minDue);
    const maxDue = filters.maxDue === "" ? Number.POSITIVE_INFINITY : Number(filters.maxDue);
    const minPurchase =
      filters.minPurchase === "" ? Number.NEGATIVE_INFINITY : Number(filters.minPurchase);
    const maxPurchase =
      filters.maxPurchase === "" ? Number.POSITIVE_INFINITY : Number(filters.maxPurchase);

    return customers.filter((customer) => {
      const queryMatch =
        !q || `${customer.name} ${customer.mobile} ${customer.village}`.toLowerCase().includes(q);
      const villageMatch = filters.village === "all" || customer.village === filters.village;
      const dueMatch = customer.currentDue >= minDue && customer.currentDue <= maxDue;
      const purchaseMatch =
        customer.totalPurchases >= minPurchase && customer.totalPurchases <= maxPurchase;
      const dueOnlyMatch = !filters.dueOnly || customer.currentDue > 0;
      const whatsappMatch = !filters.whatsappOnly || Boolean(customer.mobile?.trim());
      const lastPurchase = customer.lastPurchase || "";
      const fromMatch = !filters.purchaseFrom || lastPurchase >= filters.purchaseFrom;
      const toMatch = !filters.purchaseTo || lastPurchase <= filters.purchaseTo;
      return (
        queryMatch &&
        villageMatch &&
        dueMatch &&
        purchaseMatch &&
        dueOnlyMatch &&
        whatsappMatch &&
        fromMatch &&
        toMatch
      );
    });
  }, [customers, filters]);

  const selectedCustomers = useMemo(
    () => filteredCustomers.filter((customer) => selectedIds.has(customer.id)),
    [filteredCustomers, selectedIds],
  );

  const selectedDue = selectedCustomers.reduce((sum, customer) => sum + customer.currentDue, 0);

  useEffect(() => {
    setSelectedIds((current) => {
      const visible = new Set(filteredCustomers.map((customer) => customer.id));
      return new Set(Array.from(current).filter((id) => visible.has(id)));
    });
  }, [filteredCustomers]);

  const setKindAndPreset = (next: WhatsAppMessageKind) => {
    setKind(next);
    setMessage(messagePresets[next].message);
    setResult(null);
  };

  const selectedRecipient = previewCustomer
    ? (recipients.find((recipient) => recipient.id === previewCustomer.id) ?? null)
    : null;

  const send = async () => {
    const targets = previewCustomer
      ? ([selectedRecipient].filter(Boolean) as WhatsAppRecipient[])
      : (selectedCustomers
          .map((customer) => recipients.find((recipient) => recipient.id === customer.id))
          .filter(Boolean) as WhatsAppRecipient[]);

    if (targets.length === 0) {
      setResult({ ok: false, text: "Select a customer first." });
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const response = await sendWhatsAppBatch({ kind, recipients: targets, message });
      setResult({ ok: response.ok, text: response.note || "WhatsApp request completed." });

      if (response.ok) {
        setPreviewCustomer(null);
        setTab("send");
        window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      }
    } catch (error) {
      setResult({
        ok: false,
        text: error instanceof Error ? error.message : "WhatsApp delivery failed.",
      });
    } finally {
      setSending(false);
    }
  };

  const previewText = (customer: Customer) => {
    const latest = ledger
      .filter((entry) => entry.customerId === customer.id && entry.entryType === "purchase")
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return message
      .replaceAll("{name}", customer.name)
      .replaceAll("{due}", formatCurrency(customer.currentDue))
      .replaceAll("{totalPurchase}", formatCurrency(customer.totalPurchases))
      .replaceAll("{totalPaid}", formatCurrency(customer.totalPaid))
      .replaceAll(
        "{lastPurchase}",
        latest
          ? formatDate(latest.date)
          : customer.lastPurchase
            ? formatDate(customer.lastPurchase)
            : "—",
      );
  };

  return (
    <div className="relative space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Reminders" }]}
        eyebrow="Customer records"
        title="Reminders & WhatsApp"
        description="Choose a customer, preview the complete purchase record, edit the message and send it. Advanced filters are available for bulk selection."
        actions={
          <Badge variant="outline" className="h-9 rounded-full px-3">
            <span className="mr-2 size-2 rounded-full bg-emerald-500" />
            Live WhatsApp
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Metric
          label="Customers matched"
          value={String(filteredCustomers.length)}
          helper={`${selectedCustomers.length} selected`}
        />
        <Metric
          label="Selected due"
          value={formatCurrency(selectedDue)}
          helper="Outstanding across selected customers"
        />
        <Metric label="Message history" value={String(logs.length)} helper="Saved in Supabase" />
      </div>

      {result ? (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
          ) : (
            <X className="mt-0.5 size-5 text-destructive" />
          )}
          <p className="text-sm leading-6">{result.text}</p>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl p-1">
          <TabsTrigger value="send" className="rounded-lg py-2.5">
            <Send className="mr-2 size-4" />
            Send
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg py-2.5">
            <History className="mr-2 size-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-5">
     <Card className="shadow-soft">
  <CardHeader className="pb-3">
    <CardTitle>What do you want to share?</CardTitle>
  </CardHeader>

  <CardContent className="grid gap-3 md:grid-cols-3">
    {(Object.keys(messagePresets) as WhatsAppMessageKind[]).map((messageType) => (
      <button
        key={messageType}
        type="button"
        onClick={() => setKindAndPreset(messageType)}
        className={`flex min-h-14 items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition ${
          kind === messageType
            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
            : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"
        }`}
      >
        {messagePresets[messageType].label}
      </button>
    ))}
  </CardContent>
</Card>

          <Card className="shadow-soft">
            <CardHeader className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Filter className="size-5" />
                Advanced customer search
              </CardTitle>
              <CardDescription>
                Filter by customer, village, purchase amount, outstanding due and purchase date
                before selecting customers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative xl:col-span-2">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Name, mobile or village"
                    value={filters.query}
                    onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                  />
                </div>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={filters.village}
                  onChange={(e) => setFilters({ ...filters, village: e.target.value })}
                >
                  <option value="all">All villages</option>
                  {villages.map((village) => (
                    <option key={village} value={village}>
                      {village}
                    </option>
                  ))}
                </select>
                <Button
                  variant={filters.dueOnly ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setFilters({ ...filters, dueOnly: !filters.dueOnly })}
                >
                  Due only: {filters.dueOnly ? "On" : "Off"}
                </Button>
                <Input
                  type="number"
                  min="0"
                  placeholder="Minimum due"
                  value={filters.minDue}
                  onChange={(e) => setFilters({ ...filters, minDue: e.target.value })}
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Maximum due"
                  value={filters.maxDue}
                  onChange={(e) => setFilters({ ...filters, maxDue: e.target.value })}
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Minimum purchase"
                  value={filters.minPurchase}
                  onChange={(e) => setFilters({ ...filters, minPurchase: e.target.value })}
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Maximum purchase"
                  value={filters.maxPurchase}
                  onChange={(e) => setFilters({ ...filters, maxPurchase: e.target.value })}
                />
                <Input
                  type="date"
                  value={filters.purchaseFrom}
                  onChange={(e) => setFilters({ ...filters, purchaseFrom: e.target.value })}
                />
                <Input
                  type="date"
                  value={filters.purchaseTo}
                  onChange={(e) => setFilters({ ...filters, purchaseTo: e.target.value })}
                />
                <Button
                  variant={filters.whatsappOnly ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setFilters({ ...filters, whatsappOnly: !filters.whatsappOnly })}
                >
                  <Smartphone className="size-4" /> WhatsApp only:{" "}
                  {filters.whatsappOnly ? "On" : "Off"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setFilters(initialFilters)}
                >
                  Reset filters
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  setSelectedIds(new Set(filteredCustomers.map((customer) => customer.id)))
                }
              >
                Select all
              </Button>
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredCustomers.length} customers · {selectedCustomers.length} selected
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {filteredCustomers.map((customer) => {
              const selected = selectedIds.has(customer.id);
              return (
                <Card
                  key={customer.id}
                  className={selected ? "border-primary shadow-soft" : "shadow-soft"}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <Button
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      className="size-9 rounded-full p-0"
                      onClick={() =>
                        setSelectedIds((current) => {
                          const next = new Set(current);
                          if (next.has(customer.id)) next.delete(customer.id);
                          else next.add(customer.id);
                          return next;
                        })
                      }
                    >
                      {selected ? "✓" : ""}
                    </Button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{customer.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {customer.mobile} · {customer.village || "No village"}
                      </p>
                      <p className="mt-1 text-xs">
                        Purchase {formatCurrency(customer.totalPurchases)} · Due{" "}
                        <span className="font-semibold">{formatCurrency(customer.currentDue)}</span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setPreviewCustomer(customer)}
                    >
                      <Eye className="size-4" /> Preview
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="shadow-soft">
            <CardHeader className="space-y-1.5">
              <CardTitle>Edit message</CardTitle>
              <CardDescription>
                Supported placeholders: {"{name}"}, {"{due}"}, {"{totalPurchase}"}, {"{totalPaid}"},{" "}
                {"{lastPurchase}"}. Use blank lines to keep the WhatsApp message easy to read.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-48 w-full rounded-2xl border border-input bg-background p-4 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              {selectedCustomers[0] ? (
                <div className="rounded-2xl border bg-muted/30 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview for {selectedCustomers[0].name}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                    {previewText(selectedCustomers[0])}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-muted-foreground">
                  The reminder uses the live Meta WhatsApp connection and your selected customer
                  records.
                </p>
                <Button
                  className="rounded-full"
                  disabled={selectedCustomers.length === 0 || sending}
                  onClick={() => void send()}
                >
                  <Send className="size-4" />
                  {sending ? "Sending…" : `Send selected (${selectedCustomers.length})`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="shadow-soft">
            <CardHeader className="space-y-1.5">
              <CardTitle>Delivery history</CardTitle>
              <CardDescription>Actual WhatsApp deliveries recorded in Supabase.</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No deliveries recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 rounded-xl border p-4">
                      <BellRing className="size-4 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{log.reminderTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.recipient} · {formatDate(log.sentAt)}
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full">
                        {log.delivery}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CustomerPreviewDialog
        customer={previewCustomer}
        ledger={ledger}
        message={message}
        onMessageChange={setMessage}
        onClose={() => setPreviewCustomer(null)}
        onSend={() => void send()}
        sending={sending}
      />

      {sending ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-2xl border bg-card p-6 text-center shadow-2xl">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
              <span
                className="size-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
                style={{ animationDuration: "1.25s" }}
              />
            </div>
            <p className="mt-4 font-semibold">Saving reminder</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Sending the reminder and returning to Reminders...
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CustomerPreviewDialog({
  customer,
  ledger,
  message,
  onMessageChange,
  onClose,
  onSend,
  sending,
}: {
  customer: Customer | null;
  ledger: CustomerLedgerEntry[];
  message: string;
  onMessageChange: (value: string) => void;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
}) {
  const [items, setItems] = useState<CustomerSaleItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const records = useMemo(
    () =>
      customer
        ? ledger
            .filter((entry) => entry.customerId === customer.id)
            .sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [customer, ledger],
  );
  const latestPurchase = records.find((entry) => entry.entryType === "purchase");

  useEffect(() => {
    let active = true;
    setItems([]);
    if (!latestPurchase) return;
    setLoadingItems(true);
    void shopStore
      .fetchTransactionItems(latestPurchase.id)
      .then((next) => {
        if (active) setItems(next);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoadingItems(false);
      });
    return () => {
      active = false;
    };
  }, [latestPurchase?.id]);

  if (!customer) return null;

  const preview = message
    .replaceAll("{name}", customer.name)
    .replaceAll("{due}", formatCurrency(customer.currentDue))
    .replaceAll("{totalPurchase}", formatCurrency(customer.totalPurchases))
    .replaceAll("{totalPaid}", formatCurrency(customer.totalPaid))
    .replaceAll(
      "{lastPurchase}",
      latestPurchase
        ? formatDate(latestPurchase.date)
        : customer.lastPurchase
          ? formatDate(customer.lastPurchase)
          : "—",
    );

  return (
    <Dialog open={Boolean(customer)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle>{customer.name} — customer record</DialogTitle>
          <DialogDescription>
            {customer.mobile} · {customer.village || "Village not recorded"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Total purchase"
            value={formatCurrency(customer.totalPurchases)}
            helper="All recorded purchases"
          />
          <Metric
            label="Total paid"
            value={formatCurrency(customer.totalPaid)}
            helper="All recorded payments"
          />
          <Metric
            label="Current due"
            value={formatCurrency(customer.currentDue)}
            helper="Outstanding now"
          />
        </div>
        <Separator />
        <div className="space-y-3">
          <h3 className="font-semibold">Current purchase</h3>
          {latestPurchase ? (
            <div className="rounded-2xl border p-5">
              <div className="grid gap-4 sm:grid-cols-4">
                <Info label="Date" value={formatDate(latestPurchase.date)} />
                <Info label="Purchase" value={formatCurrency(latestPurchase.amount)} />
                <Info label="Advance / paid" value={formatCurrency(latestPurchase.payment)} />
                <Info label="That-day due" value={formatCurrency(latestPurchase.remainingDue)} />
              </div>
              <p className="mt-4 text-sm font-medium">{latestPurchase.product}</p>
              {loadingItems ? (
                <p className="mt-3 text-xs text-muted-foreground">Loading purchased items…</p>
              ) : items.length ? (
                <div className="mt-4 space-y-1 text-sm">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2"
                    >
                      <span>
                        {item.product} · {item.quantity} {item.unit} × {formatCurrency(item.rate)}
                      </span>
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No purchase recorded yet.</p>
          )}
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold">Complete purchase & payment history</h3>
          <div className="space-y-2">
            {records.map((entry) => (
              <div
                key={entry.id}
                className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
              >
                <div>
                  <p className="font-medium capitalize">
                    {entry.entryType === "purchase" ? entry.product : "Payment received"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(entry.date)} · {entry.method}
                  </p>
                </div>
                <span className="text-sm">Purchase {formatCurrency(entry.amount)}</span>
                <span className="text-sm">Paid {formatCurrency(entry.payment)}</span>
                <span className="text-sm font-semibold">
                  Due {formatCurrency(entry.remainingDue)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
          <h3 className="font-semibold">Message to share</h3>
          <textarea
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            className="min-h-44 w-full rounded-xl border border-input bg-background p-4 text-sm leading-6"
          />
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{preview}</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose} disabled={sending}>
            Close
          </Button>
          <Button className="rounded-full" disabled={sending} onClick={onSend}>
            <Send className="size-4" />
            {sending ? "Sending…" : "Edit & send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
