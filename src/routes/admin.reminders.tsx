import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  History,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, shopStore, useShopStore } from "@/lib/shop-store";
import { sendWhatsAppBatch, type WhatsAppMessageKind, type WhatsAppRecipient } from "@/lib/whatsapp";

type RecipientRow = WhatsAppRecipient & {
  status: "active" | "inactive";
  receiptReady: boolean;
  receiptRef?: string;
};

type FilterState = {
  query: string;
  minDue: string;
  maxDue: string;
  dueOnly: boolean;
  whatsappOnly: boolean;
  receiptOnly: boolean;
  activeOnly: boolean;
};

const initialFilters: FilterState = {
  query: "",
  minDue: "",
  maxDue: "",
  dueOnly: true,
  whatsappOnly: true,
  receiptOnly: false,
  activeOnly: true,
};

const messagePresets: Record<WhatsAppMessageKind, { label: string; description: string; message: string }> = {
  "due-reminder": {
    label: "Due reminder",
    description: "Send a polite payment reminder to customers with outstanding balances.",
    message:
      "Hello {name}, this is a friendly reminder from Shree Sawariya Agro Agency. Your current outstanding balance is {due}. Please contact us if you have already made the payment. Thank you.",
  },
  receipt: {
    label: "Send receipt",
    description: "Share the latest receipt reference with selected customers.",
    message:
      "Hello {name}, your latest purchase receipt from Shree Sawariya Agro Agency is ready. Receipt: {receipt}. Thank you for shopping with us.",
  },
  custom: {
    label: "Custom customer message",
    description: "Write an optional message for a filtered group or selected customers.",
    message: "Hello {name},\n\nWrite your customer message here.\n\n— Shree Sawariya Agro Agency",
  },
};

export const Route = createFileRoute("/admin/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders & WhatsApp — Admin" },
      { name: "description", content: "Filter customers, preview recipients and prepare WhatsApp reminders, receipts and customer messages." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RemindersPage,
});

function RemindersPage() {
  const customers = useShopStore((s) => s.customers);
  const orders = useShopStore((s) => s.orders);
  const reminders = useShopStore((s) => s.reminders);
  const logs = useShopStore((s) => s.reminderLogs);

  const [kind, setKind] = useState<WhatsAppMessageKind>("due-reminder");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState(messagePresets["due-reminder"].message);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ accepted: number; skipped: number; message: string } | null>(null);
  const [tab, setTab] = useState("send");

  const latestOrderByCustomer = useMemo(() => {
    const map = new Map<string, (typeof orders)[number]>();
    for (const order of orders) {
      if (!order.customerId) continue;
      if (!map.has(order.customerId)) map.set(order.customerId, order);
    }
    return map;
  }, [orders]);

  const receiptReadyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const order of orders) {
      if (order.customerId && order.code) ids.add(order.customerId);
    }
    return ids;
  }, [orders]);

  const filteredRecipients = useMemo<RecipientRow[]>(() => {
    const query = filters.query.trim().toLowerCase();
    const minDue = filters.minDue === "" ? 0 : Number(filters.minDue);
    const maxDue = filters.maxDue === "" ? Number.POSITIVE_INFINITY : Number(filters.maxDue);

    return customers
      .map((customer) => {
        const latestOrder = latestOrderByCustomer.get(customer.id);
        return {
          id: customer.id,
          name: customer.name,
          mobile: customer.mobile,
          due: customer.currentDue,
          village: customer.village,
          lastPurchase: customer.lastPurchase,
          receiptId: latestOrder?.code,
          receiptRef: latestOrder?.code,
          receiptReady: receiptReadyIds.has(customer.id),
          status: customer.status,
        };
      })
      .filter((customer) => {
        const queryMatches = !query || `${customer.name} ${customer.mobile} ${customer.village}`.toLowerCase().includes(query);
        const dueMatches = !filters.dueOnly || customer.due > 0;
        const minMatches = customer.due >= minDue;
        const maxMatches = customer.due <= maxDue;
        const whatsappMatches = !filters.whatsappOnly || Boolean(customer.mobile?.trim());
        const receiptMatches = !filters.receiptOnly || customer.receiptReady;
        const activeMatches = !filters.activeOnly || customer.status === "active";
        const kindMatches = kind !== "due-reminder" ? true : customer.due > 0;
        return queryMatches && dueMatches && minMatches && maxMatches && whatsappMatches && receiptMatches && activeMatches && kindMatches;
      });
  }, [customers, filters, kind, latestOrderByCustomer, receiptReadyIds]);

  const selectedRecipients = useMemo(
    () => filteredRecipients.filter((recipient) => selectedIds.has(recipient.id)),
    [filteredRecipients, selectedIds],
  );

  const totalSelectedDue = useMemo(
    () => selectedRecipients.reduce((sum, recipient) => sum + recipient.due, 0),
    [selectedRecipients],
  );

  const readyCount = filteredRecipients.filter((recipient) => Boolean(recipient.mobile)).length;

  const setMessageKind = (nextKind: WhatsAppMessageKind) => {
    setKind(nextKind);
    setMessage(messagePresets[nextKind].message);
    setSelectedIds(new Set());
    setSendResult(null);
    setFilters((current) => ({
      ...current,
      dueOnly: nextKind === "due-reminder",
      receiptOnly: nextKind === "receipt",
    }));
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAllVisible = () => setSelectedIds(new Set(filteredRecipients.map((recipient) => recipient.id)));
  const clearSelected = () => setSelectedIds(new Set());

  const handleSend = async () => {
    if (selectedRecipients.length === 0) return;
    setSending(true);
    setSendResult(null);
    try {
      const response = await sendWhatsAppBatch({
        kind,
        recipients: selectedRecipients,
        message,
        receiptMode: kind === "receipt" ? "latest" : undefined,
      });
      setSendResult({
        accepted: response.acceptedCount,
        skipped: response.skippedCount,
        message: response.note || "Request accepted.",
      });
      setPreviewOpen(false);
      setTab("history");
    } catch (error) {
      setSendResult({ accepted: 0, skipped: selectedRecipients.length, message: error instanceof Error ? error.message : "The messaging service is unavailable." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Reminders" }]}
        eyebrow="Customer engagement"
        title="WhatsApp reminders & messaging"
        description="Filter the exact customers you want to contact, preview the message, then send through one server-side WhatsApp integration boundary."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-9 rounded-full px-3">
              <span className="mr-2 size-2 rounded-full bg-amber-500" /> Demo mode
            </Badge>
            <Button variant="outline" className="rounded-full" onClick={() => setFilters(initialFilters)}>
              <RefreshCw className="size-4" /> Reset filters
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Filtered customers" value={String(filteredRecipients.length)} helper={`${readyCount} with WhatsApp number`} />
        <MetricCard icon={CheckCircle2} label="Selected" value={String(selectedRecipients.length)} helper={`${formatCurrency(totalSelectedDue)} outstanding`} tone="success" />
        <MetricCard icon={Clock3} label="Messages sent" value={String(logs.length)} helper="Across reminder history" />
        <MetricCard icon={ShieldCheck} label="API status" value="Demo" helper="No real WhatsApp delivery" tone="warning" />
      </div>

      {sendResult ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {sendResult.accepted > 0 ? <CheckCircle2 className="size-5" /> : <X className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{sendResult.accepted > 0 ? `${sendResult.accepted} message requests accepted` : "Message request not sent"}</p>
            <p className="text-sm text-muted-foreground">{sendResult.message}</p>
          </div>
          <Badge variant="secondary" className="w-fit rounded-full">{sendResult.skipped} skipped</Badge>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid h-auto w-full max-w-xl grid-cols-3 rounded-xl p-1">
          <TabsTrigger value="send" className="rounded-lg py-2.5"><Send className="mr-2 size-4" />Send</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg py-2.5"><History className="mr-2 size-4" />History</TabsTrigger>
          <TabsTrigger value="automation" className="rounded-lg py-2.5"><Zap className="mr-2 size-4" />Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <Card className="overflow-hidden shadow-soft">
                <CardHeader className="border-b border-border/80 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">1. Choose message</CardTitle>
                      <CardDescription className="mt-1">The purpose controls the default filters and preview template.</CardDescription>
                    </div>
                    <div className="hidden size-10 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex"><MessageCircle className="size-5" /></div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 p-5 md:grid-cols-3">
                  {(Object.keys(messagePresets) as WhatsAppMessageKind[]).map((messageType) => {
                    const active = kind === messageType;
                    const preset = messagePresets[messageType];
                    return (
                      <button
                        key={messageType}
                        type="button"
                        onClick={() => setMessageKind(messageType)}
                        className={`group rounded-2xl border p-4 text-left transition-all ${active ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" : "border-border hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/30"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className={`flex size-10 items-center justify-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {messageType === "due-reminder" ? <BellRing className="size-5" /> : messageType === "receipt" ? <FileText className="size-5" /> : <Sparkles className="size-5" />}
                          </div>
                          {active ? <Badge className="rounded-full">Selected</Badge> : null}
                        </div>
                        <p className="mt-4 font-semibold">{preset.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{preset.description}</p>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader className="border-b border-border/80 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">2. Advanced recipient filters</CardTitle>
                      <CardDescription className="mt-1">Nothing is sent until you explicitly select recipients and confirm.</CardDescription>
                    </div>
                    <Filter className="size-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={filters.query}
                      onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                      placeholder="Search by customer, mobile or village..."
                      className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FilterField label="Minimum due" prefix="₹"><input value={filters.minDue} onChange={(event) => setFilters((current) => ({ ...current, minDue: event.target.value }))} inputMode="numeric" placeholder="0" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary" /></FilterField>
                    <FilterField label="Maximum due" prefix="₹"><input value={filters.maxDue} onChange={(event) => setFilters((current) => ({ ...current, maxDue: event.target.value }))} inputMode="numeric" placeholder="No limit" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary" /></FilterField>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <FilterSwitch label="Outstanding only" checked={filters.dueOnly} onChange={(checked) => setFilters((current) => ({ ...current, dueOnly: checked }))} />
                    <FilterSwitch label="WhatsApp number" checked={filters.whatsappOnly} onChange={(checked) => setFilters((current) => ({ ...current, whatsappOnly: checked }))} />
                    <FilterSwitch label="Receipt ready" checked={filters.receiptOnly} onChange={(checked) => setFilters((current) => ({ ...current, receiptOnly: checked }))} />
                    <FilterSwitch label="Active customers" checked={filters.activeOnly} onChange={(checked) => setFilters((current) => ({ ...current, activeOnly: checked }))} />
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden shadow-soft">
                <CardHeader className="border-b border-border/80 pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-lg">3. Review recipients</CardTitle>
                      <CardDescription className="mt-1">Select individual customers or the full filtered group.</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={selectAllVisible}>Select all {filteredRecipients.length}</Button>
                      <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={clearSelected}>Clear</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b border-border bg-muted/20 px-5 py-3 text-xs text-muted-foreground"><span>{selectedRecipients.length} selected</span><span>{formatCurrency(filteredRecipients.reduce((sum, recipient) => sum + recipient.due, 0))} filtered due</span></div>
                  <div className="divide-y divide-border">
                    {filteredRecipients.length === 0 ? (
                      <div className="px-6 py-14 text-center"><Users className="mx-auto size-8 text-muted-foreground/60" /><p className="mt-3 font-medium">No customers match these filters</p><p className="mt-1 text-sm text-muted-foreground">Try widening the amount range or turning off a filter.</p></div>
                    ) : (
                      filteredRecipients.map((recipient) => {
                        const selected = selectedIds.has(recipient.id);
                        return (
                          <div key={recipient.id} className={`flex items-center gap-3 px-5 py-4 transition-colors ${selected ? "bg-primary/[0.035]" : "hover:bg-muted/25"}`}>
                            <input aria-label={`Select ${recipient.name}`} type="checkbox" checked={selected} onChange={(event) => toggleSelected(recipient.id, event.target.checked)} className="size-4 accent-[var(--color-primary)]" />
                            <div className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{recipient.name.slice(0, 1).toUpperCase()}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2"><Link to="/admin/customers/$customerId" params={{ customerId: recipient.id }} className="truncate font-medium hover:text-primary hover:underline">{recipient.name}</Link>{recipient.receiptReady ? <Badge variant="secondary" className="rounded-full text-[10px]">Receipt ready</Badge> : null}</div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">{recipient.mobile || "No WhatsApp number"} · {recipient.village || "Village not set"}</p>
                            </div>
                            <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{formatCurrency(recipient.due)}</p><p className="text-[11px] text-muted-foreground">Last purchase {formatDate(recipient.lastPurchase)}</p></div>
                            <ChevronRight className="hidden size-4 text-muted-foreground/50 md:block" />
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
              <Card className="overflow-hidden border-primary/20 shadow-soft">
                <div className="bg-gradient-to-br from-primary/10 via-background to-background p-5">
                  <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-sm font-semibold"><Smartphone className="size-4 text-primary" /> WhatsApp Business Platform</div><Badge variant="outline" className="mt-3 rounded-full border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">Demo / not connected</Badge></div><div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"><MessageCircle className="size-5" /></div></div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">The UI is wired to <span className="font-mono text-xs text-foreground">/api/whatsapp/messages</span>. The server currently validates the request without delivering any real messages.</p>
                </div>
                <CardContent className="space-y-4 p-5">
                  <div className="grid grid-cols-2 gap-3"><InfoTile label="Recipients" value={String(selectedRecipients.length)} /><InfoTile label="Delivery" value="Demo only" /><InfoTile label="Target" value="Customers" /><InfoTile label="Provider" value="Meta-ready" /></div>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">4. Message preview</p><Badge variant="secondary" className="rounded-full">{messagePresets[kind].label}</Badge></div>
                    <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={8} className="mt-3 w-full resize-none rounded-2xl border border-input bg-muted/20 p-4 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">Variables supported in the preview: <span className="font-mono">{`{name}`}</span>, <span className="font-mono">{`{due}`}</span> and <span className="font-mono">{`{receipt}`}</span>.</p>
                  </div>
                  <Button className="h-12 w-full rounded-xl text-sm font-semibold" disabled={selectedRecipients.length === 0 || !message.trim()} onClick={() => setPreviewOpen(true)}><Send className="size-4" /> Review & prepare {selectedRecipients.length || ""} messages</Button>
                  <p className="text-center text-[11px] text-muted-foreground">No message is sent until you confirm the final recipient count.</p>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Settings2 className="size-4" /> Integration settings</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm"><div className="flex items-center justify-between rounded-xl bg-muted/40 p-3"><span className="text-muted-foreground">Server endpoint</span><span className="font-mono text-xs">/api/whatsapp/messages</span></div><div className="flex items-center justify-between rounded-xl bg-muted/40 p-3"><span className="text-muted-foreground">Credentials</span><Badge variant="outline" className="rounded-full">Not configured</Badge></div><p className="text-xs leading-5 text-muted-foreground">When the real organisation WhatsApp Business credentials are available, this same server boundary can be connected to the Meta Graph API without changing the recipient workflow.</p></CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="overflow-hidden shadow-soft"><CardHeader className="border-b border-border/80"><CardTitle>Notification history</CardTitle><CardDescription>Existing reminder logs from the shop data store. Demo sends are shown separately in the confirmation banner.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead className="bg-muted/30 text-xs text-muted-foreground"><tr><th className="px-5 py-3 text-left font-medium">Reminder</th><th className="px-5 py-3 text-left font-medium">Recipient</th><th className="px-5 py-3 text-left font-medium">Channel</th><th className="px-5 py-3 text-left font-medium">Sent</th><th className="px-5 py-3 text-left font-medium">Delivery</th><th className="px-5 py-3 text-right font-medium">Retries</th></tr></thead><tbody className="divide-y divide-border">{logs.length ? logs.map((log) => <tr key={log.id} className="hover:bg-muted/20"><td className="px-5 py-3.5 font-medium">{log.reminderTitle}</td><td className="px-5 py-3.5">{log.recipient}</td><td className="px-5 py-3.5 uppercase text-muted-foreground">{log.channel}</td><td className="px-5 py-3.5 text-muted-foreground">{log.sentAt}</td><td className="px-5 py-3.5"><StatusBadge status={log.delivery === "delivered" ? "paid" : log.delivery} /></td><td className="px-5 py-3.5 text-right">{log.retries}</td></tr>) : <tr><td colSpan={6} className="px-6 py-14 text-center text-muted-foreground">No notification history yet.</td></tr>}</tbody></table></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card className="shadow-soft"><CardHeader><CardTitle>Saved reminder automations</CardTitle><CardDescription>Existing reminder definitions remain connected to the shop store. The WhatsApp composer above is used for controlled manual sends.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">{reminders.map((reminder) => <div key={reminder.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-semibold">{reminder.title}</p><p className="mt-1 text-xs text-muted-foreground">{reminder.filterSummary}</p></div><Switch checked={reminder.status === "active"} onCheckedChange={(checked) => shopStore.updateReminder(reminder.id, { status: checked ? "active" : "paused" })} aria-label={`Toggle ${reminder.title}`} /></div><div className="mt-4 flex flex-wrap gap-2"><StatusBadge status={reminder.status} /><StatusBadge status={reminder.schedule} /><StatusBadge status={reminder.channel} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><p className="text-muted-foreground">Audience<span className="mt-1 block font-semibold text-foreground">{reminder.audience}</span></p><p className="text-muted-foreground">Next run<span className="mt-1 block font-semibold text-foreground">{reminder.nextRun}</span></p></div></div>)}{!reminders.length ? <EmptyAutomation /> : null}</CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Final send review</DialogTitle><DialogDescription>Confirm exactly who will be included before the request reaches the server-side WhatsApp adapter.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3"><InfoTile label="Message type" value={messagePresets[kind].label} /><InfoTile label="Recipients" value={String(selectedRecipients.length)} /><InfoTile label="Outstanding" value={formatCurrency(totalSelectedDue)} /></div>
            <div className="max-h-56 overflow-auto rounded-2xl border border-border">{selectedRecipients.map((recipient) => <div key={recipient.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"><div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">{recipient.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{recipient.name}</p><p className="text-xs text-muted-foreground">{recipient.mobile}</p></div><span className="text-xs font-medium">{formatCurrency(recipient.due)}</span></div>)}</div>
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Message</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message}</p></div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-200"><strong>Demo mode:</strong> this confirmation will call the app's server endpoint and validate the recipient payload. It will not contact WhatsApp.</div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between"><Button variant="ghost" className="rounded-full" onClick={() => setPreviewOpen(false)}>Back</Button><Button className="rounded-full" disabled={sending} onClick={handleSend}>{sending ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}{sending ? "Preparing…" : `Confirm ${selectedRecipients.length} message requests`}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, helper, tone = "default" }: { icon: LucideIcon; label: string; value: string; helper: string; tone?: "default" | "success" | "warning" }) {
  const iconClass = tone === "success" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : tone === "warning" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary";
  return <Card className="shadow-soft"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.13em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{helper}</p></div><div className={`flex size-10 items-center justify-center rounded-xl ${iconClass}`}><Icon className="size-5" /></div></div></CardContent></Card>;
}

function FilterField({ label, prefix, children }: { label: string; prefix?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-medium text-muted-foreground">{label}</span><div className="relative">{prefix ? <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span> : null}<div className={prefix ? "pl-6" : ""}>{children}</div></div></label>;
}

function FilterSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${checked ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}><span className="text-xs font-medium">{label}</span><span className={`flex size-5 items-center justify-center rounded-md border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>{checked ? <Check className="size-3.5" /> : null}</span></button>;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-muted/25 p-3"><p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

function EmptyAutomation() {
  return <div className="col-span-full rounded-2xl border border-dashed border-border px-6 py-12 text-center"><BellRing className="mx-auto size-8 text-muted-foreground/60" /><p className="mt-3 font-medium">No saved reminder automations</p><p className="mt-1 text-sm text-muted-foreground">Use the send workflow above for controlled one-off messaging.</p></div>;
}
