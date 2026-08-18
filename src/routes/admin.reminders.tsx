import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BellRing, CheckCircle2, History, Send, ShieldCheck, Smartphone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { formatCurrency, formatDate, useShopStore } from "@/lib/shop-store";
import { sendWhatsAppBatch, type WhatsAppMessageKind, type WhatsAppRecipient } from "@/lib/whatsapp";

const messagePresets: Record<WhatsAppMessageKind, { label: string; description: string; message: string }> = {
  "due-reminder": {
    label: "Due reminder",
    description: "Send a live payment reminder.",
    message:
      "Hello {name}, this is a friendly reminder from Shree Sawariya Agro Agency. Your current outstanding balance is {due}. Please contact us if you have already made the payment. Thank you.",
  },
  receipt: {
    label: "Receipt message",
    description: "Send the latest receipt reference.",
    message:
      "Hello {name}, your latest purchase receipt from Shree Sawariya Agro Agency is ready. Receipt: {receipt}. Thank you for shopping with us.",
  },
  custom: {
    label: "Custom message",
    description: "Send your own live WhatsApp text.",
    message: "Hello {name},\n\nWrite your message here.\n\n— Shree Sawariya Agro Agency",
  },
};

export const Route = createFileRoute("/admin/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders & WhatsApp — Admin" },
      { name: "description", content: "Send a live WhatsApp reminder to the configured recipient." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RemindersPage,
});

function RemindersPage() {
  const customers = useShopStore((s) => s.customers);
  const orders = useShopStore((s) => s.orders);
  const logs = useShopStore((s) => s.reminderLogs);

  const [kind, setKind] = useState<WhatsAppMessageKind>("due-reminder");
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState(messagePresets["due-reminder"].message);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState("send");

  const recipients = useMemo<WhatsAppRecipient[]>(() => {
    const latestOrderByCustomer = new Map<string, (typeof orders)[number]>();
    for (const order of orders) {
      if (order.customerId && !latestOrderByCustomer.has(order.customerId)) {
        latestOrderByCustomer.set(order.customerId, order);
      }
    }

    return customers
      .filter((customer) => Boolean(customer.mobile?.trim()))
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
        };
      });
  }, [customers, orders]);

  const selectedRecipient = recipients.find((recipient) => recipient.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && recipients.length === 1) setSelectedId(recipients[0].id);
    if (selectedId && !recipients.some((recipient) => recipient.id === selectedId)) setSelectedId("");
  }, [recipients, selectedId]);

  const selectKind = (nextKind: WhatsAppMessageKind) => {
    setKind(nextKind);
    setMessage(messagePresets[nextKind].message);
    setResult(null);
  };

  const send = async () => {
    if (!selectedRecipient) {
      setResult({ ok: false, text: "Select exactly one recipient first." });
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const response = await sendWhatsAppBatch({
        kind,
        recipients: [selectedRecipient],
        message,
        receiptMode: kind === "receipt" ? "latest" : undefined,
      });
      setResult({ ok: response.ok, text: response.note || "WhatsApp request completed." });
      if (response.ok) setTab("history");
    } catch (error) {
      setResult({ ok: false, text: error instanceof Error ? error.message : "WhatsApp delivery failed." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Reminders" }]}
        eyebrow="Live customer engagement"
        title="WhatsApp reminders"
        description="Live Meta Cloud API delivery. One configured recipient only; there is no demo or simulated delivery path."
        actions={
          <Badge variant="outline" className="h-9 rounded-full px-3">
            <span className="mr-2 size-2 rounded-full bg-emerald-500" /> Live only
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="WhatsApp recipients" value={String(recipients.length)} helper="Customer records with a mobile number" />
        <Metric label="Selected" value={selectedRecipient ? "1" : "0"} helper={selectedRecipient?.name || "Choose the configured recipient"} />
        <Metric label="Delivery history" value={String(logs.length)} helper="Reminder log entries" />
      </div>

      {result ? (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="mt-0.5">{result.ok ? <CheckCircle2 className="size-5 text-emerald-600" /> : <X className="size-5 text-destructive" />}</div>
          <p className="text-sm leading-6">{result.text}</p>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl p-1">
          <TabsTrigger value="send" className="rounded-lg py-2.5"><Send className="mr-2 size-4" />Send</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg py-2.5"><History className="mr-2 size-4" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-5">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Message type</CardTitle>
                  <CardDescription>Each option is routed to the live Meta Cloud API.</CardDescription>
                </div>
                <ShieldCheck className="size-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {(Object.keys(messagePresets) as WhatsAppMessageKind[]).map((messageType) => (
                <button
                  key={messageType}
                  type="button"
                  onClick={() => selectKind(messageType)}
                  className={`rounded-2xl border p-4 text-left transition ${kind === messageType ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/40"}`}
                >
                  <p className="font-semibold">{messagePresets[messageType].label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{messagePresets[messageType].description}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Recipient</CardTitle>
                <CardDescription>The server only accepts the single phone number configured in WHATSAPP_RECIPIENT_PHONE.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recipients.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No customer has a mobile number.</div>
                ) : (
                  recipients.map((recipient) => {
                    const selected = recipient.id === selectedId;
                    return (
                      <button
                        key={recipient.id}
                        type="button"
                        onClick={() => setSelectedId(recipient.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                      >
                        <div className={`flex size-9 items-center justify-center rounded-lg ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          <Smartphone className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{recipient.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{recipient.mobile}</p>
                        </div>
                        {selected ? <Badge className="rounded-full">Selected</Badge> : null}
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Live message</CardTitle>
                <CardDescription>Supported placeholders: {"{name}"}, {"{due}"}, {"{receipt}"}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="min-h-48 w-full rounded-xl border border-input bg-background p-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                {selectedRecipient ? (
                  <div className="rounded-xl bg-muted/50 p-4 text-sm">
                    <p className="font-medium">Preview</p>
                    <p className="mt-2 whitespace-pre-wrap leading-6 text-muted-foreground">
                      {message
                        .replaceAll("{name}", selectedRecipient.name)
                        .replaceAll("{due}", formatCurrency(selectedRecipient.due))
                        .replaceAll("{receipt}", selectedRecipient.receiptId || "")}
                    </p>
                  </div>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">Outside the 24-hour customer-service window, Meta may require an approved template.</p>
                  <Button className="rounded-full" onClick={() => void send()} disabled={!selectedRecipient || sending}>
                    <Send className="size-4" /> {sending ? "Sending…" : "Send on WhatsApp"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Delivery history</CardTitle>
              <CardDescription>Loaded from the reminder log in Supabase.</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No reminder deliveries have been recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex flex-col gap-2 rounded-xl border border-border p-4 sm:flex-row sm:items-center">
                      <BellRing className="size-4 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{log.reminderTitle}</p>
                        <p className="text-xs text-muted-foreground">{log.recipient} · {formatDate(log.sentAt)}</p>
                      </div>
                      <Badge variant="outline" className="w-fit rounded-full">{log.delivery}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
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
