import { createFileRoute } from "@tanstack/react-router";
import { CloudUpload, DatabaseBackup, Download, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModulePageHeader as PageHeader } from "@/components/shared/ModulePageHeader";
import { useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/backups")({
  component: BackupsPage,
});

const statusStyles: Record<string, string> = {
  completed: "bg-success/15 text-success",
  running: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
};

function BackupsPage() {
  const backups = useShopStore((s) => s.backups);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Backups"
        description="Nightly snapshots of billing, stock and khata data, with manual backups before major changes."
        actions={
          <>
            <Button variant="outline" className="rounded-full">
              <Download className="size-4" /> Download latest
            </Button>
            <Button className="rounded-full">
              <CloudUpload className="size-4" /> Run backup now
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DatabaseBackup className="size-4 text-primary" /> Backup history
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Snapshot</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Destination</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">{backup.name}</TableCell>
                      <TableCell className="hidden sm:table-cell capitalize text-muted-foreground">
                        {backup.type}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {backup.destination}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{backup.createdAt}</TableCell>
                      <TableCell className="text-right">{backup.size}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={`border-0 capitalize ${statusStyles[backup.status]}`}
                        >
                          {backup.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Storage used</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={41} className="h-2" />
              <p className="text-sm text-muted-foreground">
                4.1 GB of 10 GB used across 26 retained snapshots.
              </p>
              <Button variant="outline" className="w-full rounded-full">
                <RotateCcw className="size-4" /> Restore from snapshot
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Backup schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                id="nightly"
                label="Nightly automatic backup"
                helper="Runs every day at 2:00 AM"
                defaultChecked
              />
              <ToggleRow
                id="cloud"
                label="Copy to cloud vault"
                helper="Encrypted off-site copy"
                defaultChecked
              />
              <ToggleRow
                id="failalert"
                label="Alert on failure"
                helper="SMS to the owner number"
                defaultChecked
              />
              <ToggleRow id="weekly" label="Weekly full export" helper="CSV bundle every Sunday" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  helper,
  defaultChecked,
}: {
  id: string;
  label: string;
  helper: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </div>
      <Switch id={id} defaultChecked={defaultChecked ?? false} />
    </div>
  );
}