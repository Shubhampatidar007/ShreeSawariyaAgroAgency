import { createFileRoute } from "@tanstack/react-router";
import { Download, Filter, History, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModulePageHeader as PageHeader } from "@/components/shared/ModulePageHeader";
import { useShopStore } from "@/lib/shop-store";
import type { LogSeverity } from "@/types";

export const Route = createFileRoute("/admin/activity-logs")({
  component: ActivityLogsPage,
});

const severityStyles: Record<LogSeverity, string> = {
  info: "bg-muted text-muted-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  critical: "bg-destructive/10 text-destructive",
};

function ActivityLogsPage() {
  const activityLogs = useShopStore((s) => s.activityLogs);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Activity logs"
        description="Every billing, stock and catalogue change made by your staff, kept for 12 months."
        actions={
          <>
            <Button variant="outline" className="rounded-full">
              <Filter className="size-4" /> Filter
            </Button>
            <Button variant="outline" className="rounded-full">
              <Download className="size-4" /> Export
            </Button>
          </>
        }
      />

      <Card className="shadow-soft">
        <CardHeader className="gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-primary" /> Timeline
          </CardTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by staff member, module or record…" className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-6 border-l border-border pl-6">
            {activityLogs.map((log) => (
              <li key={log.id} className="relative">
                <span className="absolute -left-[1.7rem] top-1.5 size-3 rounded-full border-2 border-background bg-primary" />
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm">
                    <span className="font-semibold">{log.actor}</span> {log.action.toLowerCase()} —{" "}
                    <span className="text-muted-foreground">{log.target}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{log.module}</Badge>
                    <Badge variant="outline" className={`border-0 capitalize ${severityStyles[log.severity]}`}>
                      {log.severity}
                    </Badge>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{log.timestamp}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}