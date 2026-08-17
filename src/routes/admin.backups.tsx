import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CloudUpload, DatabaseBackup, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { supabase } from "@/integrations/supabase/client";
import { shopStore, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/backups")({ component: BackupsPage });

const statusStyles: Record<string, string> = {
  completed: "bg-success/15 text-success",
  running: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
};

const backupTables = [
  "customers",
  "suppliers",
  "inventory_items",
  "products",
  "customer_transactions",
  "supplier_transactions",
  "orders",
  "order_items",
  "payments",
  "reminders",
  "reminder_logs",
  "cms_sections",
  "advertisements",
  "notifications",
] as const;

type BackupRow = Record<string, unknown>;

type BackupSheet = { name: string; rows: BackupRow[] };

function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/\r?\n/g, "&#10;");
}

function cellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function buildExcelXml(metadata: Record<string, string>, sheets: BackupSheet[]) {
  const metadataRows = Object.entries(metadata)
    .map(
      ([key, value]) =>
        `<Row><Cell><Data ss:Type="String">${xmlEscape(key)}</Data></Cell><Cell><Data ss:Type="String">${xmlEscape(value)}</Data></Cell></Row>`,
    )
    .join("");

  const worksheetXml = sheets
    .map((sheet) => {
      const columns = Array.from(
        new Set(sheet.rows.flatMap((row) => Object.keys(row))),
      );
      const header = columns
        .map((column) => `<Cell><Data ss:Type="String">${xmlEscape(column)}</Data></Cell>`)
        .join("");
      const rows = sheet.rows
        .map(
          (row) =>
            `<Row>${columns
              .map((column) => `<Cell><Data ss:Type="String">${xmlEscape(cellValue(row[column]))}</Data></Cell>`)
              .join("")}</Row>`,
        )
        .join("");
      return `<Worksheet ss:Name="${xmlEscape(sheet.name.slice(0, 31))}"><Table><Row>${header}</Row>${rows}</Table></Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>Shree Sawariya Agro Agency Backup</Title><Subject>Manual shop data backup</Subject></DocumentProperties><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/><Font ss:FontName="Aptos" ss:Size="10"/></Style></Styles><Worksheet ss:Name="Backup Info"><Table><Row><Cell><Data ss:Type="String">Field</Data></Cell><Cell><Data ss:Type="String">Value</Data></Cell></Row>${metadataRows}</Table></Worksheet>${worksheetXml}</Workbook>`;
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function fetchBackupSheets(): Promise<BackupSheet[]> {
  const results = await Promise.all(
    backupTables.map(async (table) => {
      const { data, error } = await (supabase.from(table) as any).select("*");
      if (error) throw new Error(`${table}: ${error.message}`);
      return { name: table, rows: (data ?? []) as BackupRow[] };
    }),
  );
  return results;
}

async function downloadLatestBackup() {
  const { data, error } = await supabase
    .from("backups")
    .select("name,destination,status")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.destination?.startsWith("supabase://shop-backups/")) {
    throw new Error("No completed cloud backup is available yet.");
  }
  const path = data.destination.replace("supabase://shop-backups/", "");
  const { data: file, error: downloadError } = await supabase.storage
    .from("shop-backups")
    .download(path);
  if (downloadError) throw downloadError;
  downloadFile(file, data.name.endsWith(".xls") ? data.name : `${data.name}.xls`);
}

async function runManualBackup() {
  const backupId = crypto.randomUUID();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `Shree-Sawariya-Agro-Agency-${stamp}.xls`;
  const path = `manual/${backupId}/${name}`;
  const destination = `supabase://shop-backups/${path}`;

  const { error: createError } = await supabase.from("backups").insert({
    id: backupId,
    name,
    type: "manual",
    size: "—",
    destination,
    status: "running",
  });
  if (createError) throw createError;

  try {
    const sheets = await fetchBackupSheets();
    const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);
    const metadata = {
      "Shop": "Shree Sawariya Agro Agency",
      "Backup type": "Manual",
      "Created": new Date().toLocaleString("en-IN"),
      "Tables included": String(sheets.length),
      "Rows included": String(totalRows),
      "Cloud destination": "Supabase Storage / shop-backups",
      "Local destination": "Browser Downloads folder",
    };
    const xml = buildExcelXml(metadata, sheets);
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });

    // Local copy: Excel opens this SpreadsheetML .xls file with separate sheets.
    downloadFile(blob, name);

    const { error: uploadError } = await supabase.storage
      .from("shop-backups")
      .upload(path, blob, {
        contentType: "application/vnd.ms-excel",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
      .from("backups")
      .update({ size: formatSize(blob.size), status: "completed" })
      .eq("id", backupId);
    if (updateError) throw updateError;

    await shopStore.reload();
    return { name, size: blob.size, rows: totalRows };
  } catch (error) {
    await supabase.from("backups").update({ status: "failed" }).eq("id", backupId);
    throw error;
  }
}

function BackupsPage() {
  const backups = useShopStore((s) => s.backups);
  const [running, setRunning] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleBackup = async () => {
    if (running) return;
    setRunning(true);
    try {
      const result = await runManualBackup();
      toast.success("Backup completed", {
        description: `${result.rows.toLocaleString("en-IN")} rows saved to Supabase and downloaded as an Excel file.`,
      });
    } catch (error) {
      console.error("Manual backup failed:", error);
      toast.error("Backup failed", {
        description: error instanceof Error ? error.message : "Unable to complete the backup.",
      });
    } finally {
      setRunning(false);
    }
  };

  const handleLatest = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadLatestBackup();
      toast.success("Latest backup downloaded");
    } catch (error) {
      toast.error("Download failed", {
        description: error instanceof Error ? error.message : "No backup is available.",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Backups"
        description="Manual backups only. One click creates a complete Excel-compatible snapshot, stores the same file securely in Supabase, and downloads a local copy."
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={() => void handleLatest()} disabled={downloading || running}>
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download latest
            </Button>
            <Button className="rounded-full" onClick={() => void handleBackup()} disabled={running}>
              {running ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload className="size-4" />}
              {running ? "Creating backup…" : "Run backup now"}
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
                  {backups.length ? backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">{backup.name}</TableCell>
                      <TableCell className="hidden sm:table-cell capitalize text-muted-foreground">{backup.type}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{backup.destination}</TableCell>
                      <TableCell className="text-muted-foreground">{backup.createdAt}</TableCell>
                      <TableCell className="text-right">{backup.size}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`border-0 capitalize ${statusStyles[backup.status] ?? ""}`}>
                          {backup.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No backups created yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="size-4 text-primary" /> What gets saved?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Every manual backup contains separate Excel sheets for customers, suppliers, inventory, products, orders, order items, payments, khata transactions, reminders, CMS, advertisements and notifications.</p>
              <p><strong className="text-foreground">Cloud:</strong> the exact Excel file is stored in the private Supabase <code>shop-backups</code> bucket.</p>
              <p><strong className="text-foreground">Local:</strong> the same Excel file is downloaded to the browser's normal Downloads folder.</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Manual backup</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>There is no midnight job, cron, automatic backup or background PC service.</p>
              <p>Only the owner/admin clicking <strong className="text-foreground">Run backup now</strong> starts the backup.</p>
              <p>The history records whether the cloud copy completed or failed.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
