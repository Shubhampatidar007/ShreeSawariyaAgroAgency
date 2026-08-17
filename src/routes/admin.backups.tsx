import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CloudUpload,
  DatabaseBackup,
  GitCompare,
  Loader2,
  MapPin,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
type ComparisonResult = {
  oldBackup: { name: string; created_at: string };
  newBackup: { name: string; created_at: string };
  additions: { table: string; rows: BackupRow[] }[];
  totalNewRows: number;
};

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
      const columns = Array.from(new Set(sheet.rows.flatMap((row) => Object.keys(row))));
      const header = columns
        .map((column) => `<Cell><Data ss:Type="String">${xmlEscape(column)}</Data></Cell>`)
        .join("");
      const rows = sheet.rows
        .map(
          (row) =>
            `<Row>${columns
              .map(
                (column) =>
                  `<Cell><Data ss:Type="String">${xmlEscape(cellValue(row[column]))}</Data></Cell>`,
              )
              .join("")}</Row>`,
        )
        .join("");
      return `<Worksheet ss:Name="${xmlEscape(sheet.name.slice(0, 31))}"><Table><Row>${header}</Row>${rows}</Table></Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>Shree Sawariya Agro Agency Backup</Title><Subject>Manual shop data backup</Subject></DocumentProperties><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/><Font ss:FontName="Aptos" ss:Size="10"/></Style></Styles><Worksheet ss:Name="Backup Info"><Table><Row><Cell><Data ss:Type="String">Field</Data></Cell><Cell><Data ss:Type="String">Value</Data></Cell></Row>${metadataRows}</Table></Worksheet>${worksheetXml}</Workbook>`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function dateFolderParts(date = new Date()) {
  return {
    year: String(date.getFullYear()),
    month: date.toLocaleString("en-US", { month: "long" }),
  };
}

async function chooseLocalBackupRoot() {
  const picker = (window as Window & {
    showDirectoryPicker?: () => Promise<any>;
  }).showDirectoryPicker;

  if (!picker) return null;
  return picker();
}

async function saveToLocalFolder(
  rootHandle: any,
  blob: Blob,
  filename: string,
  date = new Date(),
) {
  const agency = await rootHandle.getDirectoryHandle("Shree-Sawariya-Agro-Agency", {
    create: true,
  });
  const { year, month } = dateFolderParts(date);
  const yearHandle = await agency.getDirectoryHandle(year, { create: true });
  const monthHandle = await yearHandle.getDirectoryHandle(month, { create: true });
  const fileHandle = await monthHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
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

async function runManualBackup(localRootHandle: any) {
  const backupId = crypto.randomUUID();
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const name = `Shree-Sawariya-Agro-Agency-${stamp}.xls`;
  const { year, month } = dateFolderParts(now);
  const path = `manual/${year}/${month}/${name}`;
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
      Shop: "Shree Sawariya Agro Agency",
      "Backup type": "Manual",
      Created: now.toLocaleString("en-IN"),
      "Tables included": String(sheets.length),
      "Rows included": String(totalRows),
      "Cloud path": `shop-backups/${path}`,
      "Local structure": `Shree-Sawariya-Agro-Agency/${year}/${month}/${name}`,
    };

    const xml = buildExcelXml(metadata, sheets);
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });

    await saveToLocalFolder(localRootHandle, blob, name, now);

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
    return { name, rows: totalRows, year, month };
  } catch (error) {
    await supabase.from("backups").update({ status: "failed" }).eq("id", backupId);
    throw error;
  }
}

function toLocalDateBounds(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function getBackupForDate(date: string) {
  const { start, end } = toLocalDateBounds(date);
  const { data, error } = await supabase
    .from("backups")
    .select("id,name,destination,created_at")
    .eq("status", "completed")
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`No completed backup was found for ${date}.`);
  return data;
}

async function parseBackupFile(blob: Blob): Promise<BackupSheet[]> {
  const text = await blob.text();
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) throw new Error("The selected backup file is not a readable Excel backup.");

  return Array.from(doc.getElementsByTagName("Worksheet"))
    .filter((worksheet) => worksheet.getAttribute("ss:Name") !== "Backup Info")
    .map((worksheet) => {
      const name = worksheet.getAttribute("ss:Name") ?? "Sheet";
      const rowNodes = Array.from(worksheet.getElementsByTagName("Row"));
      if (!rowNodes.length) return { name, rows: [] };

      const matrix = rowNodes.map((row) =>
        Array.from(row.getElementsByTagName("Data")).map((cell) => cell.textContent ?? ""),
      );
      const columns = matrix[0] ?? [];
      const rows = matrix.slice(1).map((values) =>
        columns.reduce<BackupRow>((row, column, index) => {
          if (column) row[column] = values[index] ?? "";
          return row;
        }, {}),
      );
      return { name, rows };
    });
}

function stableRowKey(row: BackupRow) {
  if (row.id !== undefined && row.id !== "") return `id:${String(row.id)}`;
  return `row:${JSON.stringify(row)}`;
}

async function compareBackups(oldDate: string, newDate: string): Promise<ComparisonResult> {
  if (!oldDate || !newDate) throw new Error("Select both dates before comparing.");
  if (oldDate >= newDate) throw new Error("The older date must be before the newer date.");

  const [oldBackup, newBackup] = await Promise.all([
    getBackupForDate(oldDate),
    getBackupForDate(newDate),
  ]);

  const getPath = (destination: string) => {
    const prefix = "supabase://shop-backups/";
    if (!destination.startsWith(prefix)) throw new Error("The backup path is invalid.");
    return destination.slice(prefix.length);
  };

  const [oldFile, newFile] = await Promise.all([
    supabase.storage.from("shop-backups").download(getPath(oldBackup.destination)),
    supabase.storage.from("shop-backups").download(getPath(newBackup.destination)),
  ]);
  if (oldFile.error) throw oldFile.error;
  if (newFile.error) throw newFile.error;

  const [oldSheets, newSheets] = await Promise.all([
    parseBackupFile(oldFile.data),
    parseBackupFile(newFile.data),
  ]);

  const oldMap = new Map(oldSheets.map((sheet) => [sheet.name, sheet.rows]));
  const additions = newSheets
    .map((sheet) => {
      const oldRows = oldMap.get(sheet.name) ?? [];
      const oldKeys = new Set(oldRows.map(stableRowKey));
      return {
        table: sheet.name,
        rows: sheet.rows.filter((row) => !oldKeys.has(stableRowKey(row))),
      };
    })
    .filter((sheet) => sheet.rows.length);

  return {
    oldBackup: { name: oldBackup.name, created_at: oldBackup.created_at },
    newBackup: { name: newBackup.name, created_at: newBackup.created_at },
    additions,
    totalNewRows: additions.reduce((sum, sheet) => sum + sheet.rows.length, 0),
  };
}

function BackupsPage() {
  const backups = useShopStore((s) => s.backups);
  const [running, setRunning] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [oldDate, setOldDate] = useState("");
  const [newDate, setNewDate] = useState("");
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [localRootHandle, setLocalRootHandle] = useState<any>(null);
  const [selectingFolder, setSelectingFolder] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const chooseFolder = async () => {
    if (selectingFolder) return;
    setSelectingFolder(true);
    try {
      const handle = await chooseLocalBackupRoot();
      if (!handle) {
        toast.error("Your browser does not support selecting a local folder. A supported Chromium browser is required for structured local storage.");
        return;
      }
      setLocalRootHandle(handle);
      toast.success("Local backup folder connected", {
        description: "New backups will be saved under Shree-Sawariya-Agro-Agency / year / month.",
      });
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        toast.error("Folder selection failed", {
          description: error instanceof Error ? error.message : "Unable to connect the folder.",
        });
      }
    } finally {
      setSelectingFolder(false);
    }
  };

  const handleBackup = async () => {
    if (running) return;
    setRunning(true);
    try {
      const handle = localRootHandle ?? (await chooseLocalBackupRoot());
      if (!handle) {
        toast.error("Choose a local backup folder first", {
          description: "The backup needs a real local folder so it can create the year/month structure.",
        });
        return;
      }
      setLocalRootHandle(handle);
      const result = await runManualBackup(handle);
      toast.success("Backup completed", {
        description: `${result.rows.toLocaleString("en-IN")} rows saved to Supabase and ${result.year}/${result.month}.`,
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

  const handleCompare = async () => {
    if (comparing) return;
    setComparing(true);
    setComparison(null);
    try {
      const result = await compareBackups(oldDate, newDate);
      setComparison(result);
      toast.success("Comparison completed", {
        description: `${result.totalNewRows.toLocaleString("en-IN")} new rows were added in the newer snapshot.`,
      });
    } catch (error) {
      toast.error("Comparison failed", {
        description: error instanceof Error ? error.message : "Unable to compare the selected backups.",
      });
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    let interval: number | null = null;

    const checkReminder = async () => {
      const now = new Date();
      if (now.getHours() !== 7 || now.getMinutes() !== 0) return;
      const key = `backup-reminder-shown-${now.toISOString().slice(0, 10)}`;
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");

      const { start, end } = toLocalDateBounds(today);
      const { count, error } = await supabase
        .from("backups")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("created_at", start)
        .lt("created_at", end);
      if (error || (count ?? 0) > 0) return;

      toast.info("Daily backup reminder", {
        description: "It is 7:00 AM. Save today's shop backup now.",
        duration: 12000,
        action: {
          label: "Run backup",
          onClick: () => void handleBackup(),
        },
      });
    };

    void checkReminder();
    interval = window.setInterval(() => void checkReminder(), 60_000);
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [today, localRootHandle]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Backups"
        description="Manual backups only. Run a backup when you need a fresh Excel snapshot of the shop data."
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={() => void chooseFolder()} disabled={selectingFolder || running}>
              {selectingFolder ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
              {localRootHandle ? "Local folder connected" : "Choose local folder"}
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
                  {backups.length ? (
                    backups.map((backup) => (
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
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No backups created yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Save className="size-4 text-primary" /> Local backup folder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Choose a local parent folder in a supported Chromium browser. The backup creates this structure automatically:</p>
            <pre className="overflow-x-auto rounded-xl bg-muted p-3 text-xs leading-5 text-foreground">{`Shree-Sawariya-Agro-Agency/\n  2026/\n    August/\n      Shree-Sawariya-Agro-Agency-....xls`}</pre>
            <p>{localRootHandle ? "Connected. Future backups in this session will use the structured folders." : "Not connected yet. Run backup will ask you to choose the parent folder."}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitCompare className="size-4 text-primary" /> Compare data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="backup-old-date">Older date</label>
              <Input id="backup-old-date" type="date" value={oldDate} onChange={(event) => setOldDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="backup-new-date">Newer date</label>
              <Input id="backup-new-date" type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} />
            </div>
            <Button onClick={() => void handleCompare()} disabled={comparing || !oldDate || !newDate} className="rounded-full">
              {comparing ? <Loader2 className="size-4 animate-spin" /> : <GitCompare className="size-4" />}
              {comparing ? "Comparing…" : "Compare data"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            The comparison uses the latest completed backup from each selected date and reports records that exist in the newer snapshot but not in the older snapshot.
          </p>

          {comparison ? (
            <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-background p-3"><p className="text-xs text-muted-foreground">Older snapshot</p><p className="mt-1 truncate text-sm font-semibold">{comparison.oldBackup.name}</p></div>
                <div className="rounded-xl border bg-background p-3"><p className="text-xs text-muted-foreground">Newer snapshot</p><p className="mt-1 truncate text-sm font-semibold">{comparison.newBackup.name}</p></div>
                <div className="rounded-xl border bg-background p-3"><p className="text-xs text-muted-foreground">New records</p><p className="mt-1 text-lg font-bold">{comparison.totalNewRows.toLocaleString("en-IN")}</p></div>
              </div>

              {comparison.additions.length ? (
                <div className="space-y-4">
                  {comparison.additions.map((sheet) => {
                    const columns = Array.from(new Set(sheet.rows.flatMap((row) => Object.keys(row))));
                    return (
                      <div key={sheet.table} className="overflow-hidden rounded-xl border bg-background">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                          <p className="text-sm font-semibold">{sheet.table}</p>
                          <Badge variant="secondary">{sheet.rows.length} new</Badge>
                        </div>
                        <div className="max-h-80 overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {columns.map((column) => <TableHead key={column}>{column}</TableHead>)}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sheet.rows.map((row, rowIndex) => (
                                <TableRow key={`${sheet.table}-${rowIndex}`}>
                                  {columns.map((column) => (
                                    <TableCell key={column} className="max-w-[260px] whitespace-nowrap text-xs">
                                      {cellValue(row[column])}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border bg-background p-5 text-center text-sm text-muted-foreground">
                  No new records were added between the selected backup dates.
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5 shadow-soft">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Daily backup reminder — 7:00 AM</p>
            <p className="mt-1 text-sm text-muted-foreground">When the admin panel is open at 7:00 AM, the app checks whether today's backup exists and asks the owner/admin to save it.</p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full">Reminder only · no automatic backup</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
