import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModulePageHeader as PageHeader } from "@/components/shared/ModulePageHeader";
import { securityLogs } from "@/data/admin";
import type { LogSeverity } from "@/types";

export const Route = createFileRoute("/admin/security-logs")({
  component: SecurityLogsPage,
});

const severityStyles: Record<LogSeverity, string> = {
  info: "bg-muted text-muted-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  critical: "bg-destructive/10 text-destructive",
};

function SecurityLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Security logs"
        description="Sign-ins, blocked attempts and permission changes across every staff account."
        actions={
          <Button variant="outline" className="rounded-full">
            Force sign-out all devices
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SecurityStat icon={ShieldCheck} label="Successful sign-ins" value="42" helper="Last 7 days" tone="text-success" />
        <SecurityStat icon={ShieldX} label="Blocked attempts" value="7" helper="3 unique IP addresses" tone="text-destructive" />
        <SecurityStat icon={ShieldAlert} label="Awaiting review" value="1" helper="New device authorised" tone="text-warning" />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Recent security events</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="hidden md:table-cell">IP / device</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {securityLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${log.severity === "critical" ? "bg-destructive" : log.severity === "warning" ? "bg-warning" : "bg-success"}`} />
                        {log.event}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.account}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {log.ip} · {log.device}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {log.location}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.timestamp}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`border-0 capitalize ${severityStyles[log.severity]}`}>
                        {log.status}
                      </Badge>
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

function SecurityStat({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: typeof ShieldAlert;
  label: string;
  value: string;
  helper: string;
  tone: string;
}) {
  return (
    <Card className="shadow-soft">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <Icon className={`size-6 ${tone}`} />
      </CardContent>
    </Card>
  );
}