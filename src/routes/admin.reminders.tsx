import { createFileRoute } from "@tanstack/react-router";
import { BellRing, CheckCircle2, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { SummaryCards } from "@/components/shared/SummaryCards";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, shopStore, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders — Admin" },
      { name: "description", content: "Automated khata and payment reminders with delivery history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RemindersPage,
});

function RemindersPage() {
  const reminders = useShopStore((s) => s.reminders);
  const logs = useShopStore((s) => s.reminderLogs);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Reminders" }]}
        eyebrow="Engagement"
        title="Reminders & notification centre"
        description="Segment farmers and suppliers, schedule reminders and track delivery."
        actions={
          <Button className="rounded-full">
            <Send className="size-4" /> New reminder
          </Button>
        }
      />

      <SummaryCards
        items={[
          {
            label: "Active reminders",
            value: String(reminders.filter((r) => r.status === "active").length),
            icon: BellRing,
          },
          {
            label: "Due amount targeted",
            value: formatCurrency(reminders.reduce((sum, r) => sum + r.dueAmount, 0)),
            icon: Clock,
            tone: "warning",
          },
          {
            label: "Delivered messages",
            value: String(logs.filter((l) => l.delivery === "delivered").length),
            icon: CheckCircle2,
            tone: "success",
          },
          {
            label: "Failed / retrying",
            value: String(logs.filter((l) => l.delivery !== "delivered").length),
            icon: Send,
            tone: "danger",
          },
        ]}
      />

      <Tabs defaultValue="reminders">
        <TabsList>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="history">Notification history</TabsTrigger>
        </TabsList>

        <TabsContent value="reminders" className="mt-4 grid gap-4 lg:grid-cols-2">
          {reminders.map((reminder) => (
            <Card key={reminder.id} className="shadow-soft transition-shadow hover:shadow-lg">
              <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{reminder.title}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{reminder.filterSummary}</p>
                </div>
                <Switch
                  checked={reminder.status === "active"}
                  onCheckedChange={(checked) =>
                    shopStore.updateReminder(reminder.id, {
                      status: checked ? "active" : "paused",
                    })
                  }
                  aria-label="Toggle reminder"
                />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={reminder.status} />
                  <StatusBadge status={reminder.schedule} />
                  <StatusBadge status={reminder.channel} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <p>
                    Audience<span className="block font-semibold text-foreground">{reminder.audience}</span>
                  </p>
                  <p>
                    Next run<span className="block font-semibold text-foreground">{reminder.nextRun}</span>
                  </p>
                </div>
                <div className="rounded-lg border border-dashed border-border bg-muted/50 p-3 text-xs">
                  <p className="font-semibold text-muted-foreground">Message preview</p>
                  <p className="mt-1">{reminder.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="overflow-hidden shadow-soft">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reminder</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Sent at</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead className="text-right">Retries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.reminderTitle}</TableCell>
                        <TableCell>{log.recipient}</TableCell>
                        <TableCell className="uppercase text-muted-foreground">{log.channel}</TableCell>
                        <TableCell className="text-muted-foreground">{log.sentAt}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={log.delivery === "delivered" ? "paid" : log.delivery}
                          />
                        </TableCell>
                        <TableCell className="text-right">{log.retries}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
