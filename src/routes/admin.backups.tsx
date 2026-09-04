import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  CloudUpload,
  DatabaseBackup,
  FileSpreadsheet,
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
  "notifications",
] as const;

type BackupRow = Record<string, unknown>;
type BackupSheet = { name: string; rows: BackupRow[] };
type KhataRow = Record<string, string>;
type PartyMaster = {
  id: string;
  name: string;
  type: "Customer" | "Supplier";
  contact: string;
  location: string;
  total: number;
  paid: number;
  balance: number;
  lastActivity: string;
};
type ComparisonResult = {
  oldBackup: { name: string; created_at: string };
  newBackup: { name: string; created_at: string };
  additions: { table: string; rows: BackupRow[] }[];
  totalNewRows: number;
};

const DAILY_HEADERS = [
  "ID",
  "Date",
  "Party",
  "Type",
  "Entry",
  "Particular",
  "Quantity",
  "Unit",
  "Rate",
  "Amount",
  "Paid / Given",
  "Due / Balance",
  "Payment Method",
  "Reference",
  "Remarks",
  "Recorded At",
];

const PARTY_SUMMARY_HEADERS = [
  "Party ID",
  "Party",
  "Type",
  "Contact",
  "Location",
  "Total Sale / Purchase",
  "Total Paid / Given",
  "Current Due / Balance",
  "Last Activity",
];

const PARTY_HISTORY_HEADERS = [
  "Date",
  "Party",
  "Type",
  "Entry",
  "Particular",
  "Debit",
  "Credit",
  "Balance",
  "Method",
  "Reference",
  "Remarks",
  "Transaction ID",
];

const MONEY_HEADERS = new Set([
  "Amount",
  "Paid / Given",
  "Due / Balance",
  "Rate",
  "Total Sale / Purchase",
  "Total Paid / Given",
  "Current Due / Balance",
  "Debit",
  "Credit",
  "Balance",
]);

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

function formatMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount === 0) return "—";
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatQuantity(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount === 0) return "";
  return amount.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

function formatDate(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateFolderParts(date = new Date()) {
  return {
    year: String(date.getFullYear()),
    month: date.toLocaleString("en-US", { month: "long" }),
  };
}

async function chooseLocalBackupRoot() {
  const picker = (
    window as Window & {
      showDirectoryPicker?: () => Promise<any>;
    }
  ).showDirectoryPicker;

  if (!picker) return null;
  return picker();
}

async function getAgencyHandle(rootHandle: any) {
  return rootHandle.getDirectoryHandle("Shree-Sawariya-Agro-Agency", {
    create: true,
  });
}

async function saveToLocalFolder(rootHandle: any, blob: Blob, filename: string, date = new Date()) {
  const agency = await getAgencyHandle(rootHandle);
  const { year, month } = dateFolderParts(date);
  const yearHandle = await agency.getDirectoryHandle(year, { create: true });
  const monthHandle = await yearHandle.getDirectoryHandle(month, { create: true });
  const fileHandle = await monthHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function readExistingLocalFile(rootHandle: any, filename: string) {
  const agency = await getAgencyHandle(rootHandle);
  const khataHandle = await agency.getDirectoryHandle("Khata", { create: true });
  try {
    const fileHandle = await khataHandle.getFileHandle(filename);
    return await fileHandle.getFile();
  } catch (error) {
    if ((error as Error)?.name === "NotFoundError") return null;
    throw error;
  }
}

async function savePersistentKhataBook(rootHandle: any, blob: Blob) {
  const agency = await getAgencyHandle(rootHandle);
  const khataHandle = await agency.getDirectoryHandle("Khata", { create: true });
  const fileHandle = await khataHandle.getFileHandle("Khata-Book.xls", { create: true });
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

async function fetchKhataSource() {
  const [customersResult, suppliersResult, customerTransactionsResult, supplierTransactionsResult] =
    await Promise.all([
      supabase.from("customers").select("*"),
      supabase.from("suppliers").select("*"),
      supabase.from("customer_transactions").select("*"),
      supabase.from("supplier_transactions").select("*"),
    ]);

  for (const result of [
    customersResult,
    suppliersResult,
    customerTransactionsResult,
    supplierTransactionsResult,
  ]) {
    if (result.error) throw result.error;
  }

  return {
    customers: (customersResult.data ?? []) as BackupRow[],
    suppliers: (suppliersResult.data ?? []) as BackupRow[],
    customerTransactions: (customerTransactionsResult.data ?? []) as BackupRow[],
    supplierTransactions: (supplierTransactionsResult.data ?? []) as BackupRow[],
  };
}

function customerPartyName(row: BackupRow, customersById: Map<string, BackupRow>) {
  const customer = customersById.get(String(row.customer_id ?? ""));
  return String(customer?.name ?? row.customer_name ?? "Unknown customer");
}

function supplierPartyName(row: BackupRow, suppliersById: Map<string, BackupRow>) {
  const supplier = suppliersById.get(String(row.supplier_id ?? ""));
  return String(supplier?.name ?? row.supplier_name ?? "Unknown supplier");
}

function buildDailyKhataRows(source: Awaited<ReturnType<typeof fetchKhataSource>>) {
  const customersById = new Map(source.customers.map((row) => [String(row.id), row]));
  const suppliersById = new Map(source.suppliers.map((row) => [String(row.id), row]));
  const rows: KhataRow[] = [];

  for (const transaction of source.customerTransactions) {
    rows.push({
      ID: String(transaction.id ?? ""),
      Date: formatDate(transaction.entry_date),
      Party: customerPartyName(transaction, customersById),
      Type: "Customer",
      Entry: String(transaction.entry_type ?? "").replace(/_/g, " "),
      Particular: String(transaction.product ?? transaction.entry_type ?? "—"),
      Quantity: formatQuantity(transaction.quantity),
      Unit: "",
      Rate: formatMoney(
        numberValue(transaction.quantity) ? numberValue(transaction.amount) / numberValue(transaction.quantity) : 0,
      ),
      Amount: formatMoney(transaction.amount),
      "Paid / Given": formatMoney(transaction.payment),
      "Due / Balance": formatMoney(transaction.remaining_due),
      "Payment Method": String(transaction.method ?? "—"),
      Reference: String(transaction.order_id ?? "—"),
      Remarks: String(transaction.remarks ?? "—"),
      "Recorded At": formatDateTime(transaction.created_at),
    });
  }

  for (const transaction of source.supplierTransactions) {
    const entryType = String(transaction.entry_type ?? "").replace(/_/g, " ");
    const isPurchase = entryType.toLowerCase() === "purchase";
    rows.push({
      ID: String(transaction.id ?? ""),
      Date: formatDate(transaction.entry_date),
      Party: supplierPartyName(transaction, suppliersById),
      Type: "Supplier",
      Entry: entryType,
      Particular: String(
        transaction.product_name ?? transaction.reference ?? (isPurchase ? "Purchase" : entryType || "Transaction"),
      ),
      Quantity: formatQuantity(transaction.quantity),
      Unit: String(transaction.unit ?? ""),
      Rate: formatMoney(transaction.rate),
      Amount: isPurchase ? formatMoney(transaction.amount) : "—",
      "Paid / Given": isPurchase ? "—" : formatMoney(transaction.amount),
      "Due / Balance": formatMoney(transaction.balance),
      "Payment Method": String(transaction.method ?? "—"),
      Reference: String(transaction.reference ?? "—"),
      Remarks: String(transaction.remarks ?? "—"),
      "Recorded At": formatDateTime(transaction.created_at),
    });
  }

  return rows.sort((a, b) => {
    const dateA = new Date(a["Recorded At"] || a.Date).getTime();
    const dateB = new Date(b["Recorded At"] || b.Date).getTime();
    return dateA - dateB;
  });
}

function mergeDailyKhataRows(existingRows: KhataRow[], currentRows: KhataRow[]) {
  const merged = new Map<string, KhataRow>();
  existingRows.forEach((row) => {
    if (row.ID) merged.set(row.ID, row);
  });

  for (const row of currentRows) {
    if (row.ID) {
      merged.set(row.ID, row);
      continue;
    }
    const fallback = [row.Date, row.Party, row.Entry, row.Particular, row.Amount, row["Recorded At"]].join("|");
    merged.set(fallback, row);
  }

  return Array.from(merged.values()).sort((a, b) => {
    const dateA = new Date(a["Recorded At"] || a.Date).getTime();
    const dateB = new Date(b["Recorded At"] || b.Date).getTime();
    return dateA - dateB;
  });
}

function buildPartyLedgerRows(dailyRows: KhataRow[]) {
  return dailyRows.map((row) => {
    const isCustomer = row.Type === "Customer";
    const entry = row.Entry.toLowerCase();
    const debit = isCustomer
      ? numberValue(row.Amount.replace(/[^\d.-]/g, ""))
      : entry === "purchase"
        ? numberValue(row.Amount.replace(/[^\d.-]/g, ""))
        : 0;
    const credit = isCustomer
      ? numberValue(row["Paid / Given"].replace(/[^\d.-]/g, ""))
      : entry === "purchase"
        ? 0
        : numberValue(row["Paid / Given"].replace(/[^\d.-]/g, ""));

    return {
      Date: row.Date,
      Party: row.Party,
      Type: row.Type,
      Entry: row.Entry,
      Particular: row.Particular,
      Debit: formatMoney(debit),
      Credit: formatMoney(credit),
      Balance: row["Due / Balance"],
      Method: row["Payment Method"],
      Reference: row.Reference,
      Remarks: row.Remarks,
      "Transaction ID": row.ID,
    };
  });
}

function buildPartySummary(
  source: Awaited<ReturnType<typeof fetchKhataSource>>,
  dailyRows: KhataRow[],
): PartyMaster[] {
  const summary = new Map<string, PartyMaster>();

  for (const customer of source.customers) {
    const id = String(customer.id ?? `customer-${customer.name}`);
    summary.set(id, {
      id,
      name: String(customer.name ?? "Unnamed customer"),
      type: "Customer",
      contact: String(customer.mobile ?? "—"),
      location: String(customer.village ?? customer.address ?? "—"),
      total: numberValue(customer.total_purchases),
      paid: numberValue(customer.total_paid),
      balance: numberValue(customer.current_due),
      lastActivity: formatDate(customer.last_purchase),
    });
  }

  for (const supplier of source.suppliers) {
    const id = String(supplier.id ?? `supplier-${supplier.name}`);
    summary.set(id, {
      id,
      name: String(supplier.name ?? "Unnamed supplier"),
      type: "Supplier",
      contact: String(supplier.mobile ?? supplier.email ?? "—"),
      location: String(supplier.address ?? supplier.company ?? "—"),
      total: numberValue(supplier.total_purchases),
      paid: numberValue(supplier.total_paid),
      balance: numberValue(supplier.due_balance),
      lastActivity: formatDate(supplier.last_order),
    });
  }

  const partyActivity = new Map<string, { total: number; paid: number; balance: number; lastDate: string }>();
  for (const row of dailyRows) {
    const key = `${row.Type}:${row.Party}`;
    const current = partyActivity.get(key) ?? { total: 0, paid: 0, balance: 0, lastDate: row.Date };
    const amount = numberValue(row.Amount.replace(/[^\d.-]/g, ""));
    const paid = numberValue(row["Paid / Given"].replace(/[^\d.-]/g, ""));
    if (row.Type === "Customer") {
      current.total += amount;
      current.paid += paid;
    } else if (row.Entry.toLowerCase() === "purchase") {
      current.total += amount;
    } else {
      current.paid += paid;
    }
    current.balance = numberValue(row["Due / Balance"].replace(/[^\d.-]/g, ""));
    current.lastDate = row.Date || current.lastDate;
    partyActivity.set(key, current);
  }

  for (const activity of partyActivity.entries()) {
    const [type, partyName] = activity[0].split(":");
    const values = activity[1];
    const existing = Array.from(summary.values()).find(
      (party) => party.type === type && party.name === partyName,
    );
    if (existing) continue;
    const typeValue = type === "Supplier" ? "Supplier" : "Customer";
    const fallbackId = `${typeValue.toLowerCase()}-history-${partyName}`;
    summary.set(fallbackId, {
      id: fallbackId,
      name: partyName,
      type: typeValue,
      contact: "—",
      location: "Recovered from local history",
      total: values.total,
      paid: values.paid,
      balance: values.balance,
      lastActivity: values.lastDate,
    });
  }

  return Array.from(summary.values()).sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.name.localeCompare(b.name);
  });
}

function rowCells(values: string[], styleForColumn?: (column: string) => string) {
  return values
    .map((value, index) => {
      const style = styleForColumn?.(String(index)) ?? "Body";
      return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`;
    })
    .join("");
}

function buildWorksheet(name: string, xml: string) {
  return `<Worksheet ss:Name="${xmlEscape(name.slice(0, 31))}"><Table>${xml}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><Selected/><FreezePanes/><FrozenNoSplit/><SplitHorizontal>5</SplitHorizontal><TopRowBottomPane>5</TopRowBottomPane><ProtectContents>False</ProtectContents></WorksheetOptions></Worksheet>`;
}

function buildHumanReadableWorkbookXml(metadata: Record<string, string>, dailyRows: KhataRow[], partySummary: PartyMaster[]) {
  const partyHistory = buildPartyLedgerRows(dailyRows);
  const generatedAt = metadata.Created ?? new Date().toLocaleString("en-IN");

  const dailyHeader = `<Row ss:AutoFitHeight="0"><Cell ss:MergeAcross="15" ss:StyleID="Title"><Data ss:Type="String">SHREE SAWARIYA AGRO AGENCY — DAILY KHATA</Data></Cell></Row><Row><Cell ss:MergeAcross="15" ss:StyleID="SubTitle"><Data ss:Type="String">Daily business entries • updated from the latest backup • Generated ${xmlEscape(generatedAt)}</Data></Cell></Row><Row>${DAILY_HEADERS.map((header) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(header)}</Data></Cell>`).join("")}</Row>`;
  const dailyBody = dailyRows
    .map((row) => {
      const values = DAILY_HEADERS.map((header) => row[header] ?? "");
      return `<Row>${values
        .map((value, index) => {
          const header = DAILY_HEADERS[index];
          const style = MONEY_HEADERS.has(header)
            ? "Money"
            : header === "Date" || header === "Recorded At"
              ? "Date"
              : "Body";
          return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`;
        })
        .join("")}</Row>`;
    })
    .join("");

  const partyHeader = `<Row><Cell ss:MergeAcross="8" ss:StyleID="Title"><Data ss:Type="String">PARTY KHATA — CUSTOMERS &amp; SUPPLIERS</Data></Cell></Row><Row><Cell ss:MergeAcross="8" ss:StyleID="SubTitle"><Data ss:Type="String">One living summary for every party, followed by the complete transaction history.</Data></Cell></Row><Row><Cell ss:MergeAcross="8" ss:StyleID="Section"><Data ss:Type="String">PARTY SUMMARY</Data></Cell></Row><Row>${PARTY_SUMMARY_HEADERS.map((header) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(header)}</Data></Cell>`).join("")}</Row>`;
  const partyBody = partySummary
    .map((party) => {
      const values = [
        party.id,
        party.name,
        party.type,
        party.contact,
        party.location,
        formatMoney(party.total),
        formatMoney(party.paid),
        formatMoney(party.balance),
        party.lastActivity,
      ];
      return `<Row>${values
        .map((value, index) => {
          const header = PARTY_SUMMARY_HEADERS[index];
          const style = MONEY_HEADERS.has(header) ? "Money" : header === "Last Activity" ? "Date" : "Body";
          return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`;
        })
        .join("")}</Row>`;
    })
    .join("");

  const partyHistoryHeader = `<Row><Cell ss:MergeAcross="11" ss:StyleID="Section"><Data ss:Type="String">TRANSACTION HISTORY</Data></Cell></Row><Row>${PARTY_HISTORY_HEADERS.map((header) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(header)}</Data></Cell>`).join("")}</Row>`;
  const partyHistoryBody = partyHistory
    .map((row) => {
      const values = PARTY_HISTORY_HEADERS.map((header) => row[header] ?? "");
      return `<Row>${values
        .map((value, index) => {
          const header = PARTY_HISTORY_HEADERS[index];
          const style = MONEY_HEADERS.has(header) ? "Money" : header === "Date" ? "Date" : "Body";
          return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`;
        })
        .join("")}</Row>`;
    })
    .join("");

  const infoRow = `<Row><Cell ss:StyleID="Note"><Data ss:Type="String">Records retained locally</Data></Cell><Cell ss:StyleID="Note"><Data ss:Type="String">${xmlEscape(String(dailyRows.length))}</Data></Cell></Row><Row><Cell ss:StyleID="Note"><Data ss:Type="String">Local purpose</Data></Cell><Cell ss:StyleID="Note"><Data ss:Type="String">Human-readable disaster-recovery khata; not stored in Supabase.</Data></Cell></Row>`;

  const dailySheet = buildWorksheet("Daily Khata", dailyHeader + dailyBody);
  const partySheet = buildWorksheet(
    "Party Khata",
    partyHeader + partyBody + `<Row><Cell ss:MergeAcross="8"><Data ss:Type="String"></Data></Cell></Row>` + partyHistoryHeader + partyHistoryBody + `<Row><Cell ss:MergeAcross="8"><Data ss:Type="String"></Data></Cell></Row>` + infoRow,
  );

  const columns = [
    `<Column ss:Width="120"/>`,
    `<Column ss:Width="88"/>`,
    `<Column ss:Width="150"/>`,
    `<Column ss:Width="85"/>`,
    `<Column ss:Width="100"/>`,
    `<Column ss:Width="180"/>`,
    `<Column ss:Width="80"/>`,
    `<Column ss:Width="60"/>`,
    `<Column ss:Width="88"/>`,
    `<Column ss:Width="110"/>`,
    `<Column ss:Width="110"/>`,
    `<Column ss:Width="115"/>`,
    `<Column ss:Width="115"/>`,
    `<Column ss:Width="150"/>`,
    `<Column ss:Width="220"/>`,
    `<Column ss:Width="145"/>`,
  ].join("");

  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>Shree Sawariya Agro Agency — Khata Book</Title><Subject>Human-readable local disaster recovery khata</Subject><Author>Shree Sawariya Agro Agency</Author></DocumentProperties><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Aptos" ss:Size="10"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders></Style><Style ss:ID="Title"><Font ss:FontName="Aptos Display" ss:Size="16" ss:Bold="1"/><Alignment ss:Vertical="Center"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#94A3B8"/></Borders></Style><Style ss:ID="SubTitle"><Font ss:FontName="Aptos" ss:Size="10" ss:Italic="1" ss:Color="#475569"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/></Style><Style ss:ID="Section"><Font ss:FontName="Aptos" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#CBD5E1" ss:Pattern="Solid"/></Style><Style ss:ID="Header"><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/></Borders></Style><Style ss:ID="Body"><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style><Style ss:ID="Money"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="&quot;₹&quot;#,##0.00"/></Style><Style ss:ID="Date"><Alignment ss:Vertical="Center"/></Style><Style ss:ID="Note"><Font ss:FontName="Aptos" ss:Size="9" ss:Color="#475569"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/></Style></Styles>${dailySheet.replace("<Table>", `<Table>${columns}`)}${partySheet}</Workbook>`;
}

function parseKhataWorkbook(text: string) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) throw new Error("The existing Khata-Book.xls is not readable.");

  const worksheet = Array.from(doc.getElementsByTagName("Worksheet")).find(
    (item) => item.getAttribute("ss:Name") === "Daily Khata",
  );
  if (!worksheet) return [];

  const rows = Array.from(worksheet.getElementsByTagName("Row"));
  const matrix = rows.map((row) =>
    Array.from(row.getElementsByTagName("Data")).map((cell) => cell.textContent ?? ""),
  );
  const headerIndex = matrix.findIndex((values) => values[0] === "ID" && values[1] === "Date");
  if (headerIndex < 0) return [];

  const headers = matrix[headerIndex];
  return matrix.slice(headerIndex + 1).reduce<KhataRow[]>((result, values) => {
    if (!values.some(Boolean)) return result;
    const row = headers.reduce<KhataRow>((acc, header, index) => {
      if (header) acc[header] = values[index] ?? "";
      return acc;
    }, {});
    if (row.ID || row.Party) result.push(row);
    return result;
  }, []);
}

async function loadExistingKhataRows(rootHandle: any) {
  const file = await readExistingLocalFile(rootHandle, "Khata-Book.xls");
  if (!file) return [];
  return parseKhataWorkbook(await file.text());
}

function buildRawBackupWorkbook(metadata: Record<string, string>, sheets: BackupSheet[]) {
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
        .map((column) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(column)}</Data></Cell>`)
        .join("");
      const rows = sheet.rows
        .map(
          (row) =>
            `<Row>${columns
              .map(
                (column) =>
                  `<Cell ss:StyleID="Body"><Data ss:Type="String">${xmlEscape(cellValue(row[column]))}</Data></Cell>`,
              )
              .join("")}</Row>`,
        )
        .join("");
      return `<Worksheet ss:Name="${xmlEscape(sheet.name.slice(0, 31))}"><Table><Row>${header}</Row>${rows}</Table></Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>Shree Sawariya Agro Agency Backup</Title><Subject>Manual shop data backup</Subject></DocumentProperties><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Aptos" ss:Size="10"/></Style><Style ss:ID="Header"><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="Body"><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style></Styles><Worksheet ss:Name="Backup Info"><Table><Row><Cell ss:StyleID="Header"><Data ss:Type="String">Field</Data></Cell><Cell ss:StyleID="Header"><Data ss:Type="String">Value</Data></Cell></Row>${metadataRows}</Table></Worksheet>${worksheetXml}</Workbook>`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
    const [sheets, khataSource, existingKhataRows] = await Promise.all([
      fetchBackupSheets(),
      fetchKhataSource(),
      loadExistingKhataRows(localRootHandle),
    ]);
    const currentDailyRows = buildDailyKhataRows(khataSource);
    const dailyRows = mergeDailyKhataRows(existingKhataRows, currentDailyRows);
    const partySummary = buildPartySummary(khataSource, dailyRows);
    const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);

    const metadata = {
      Shop: "Shree Sawariya Agro Agency",
      "Backup type": "Manual",
      Created: now.toLocaleString("en-IN"),
      "Tables included": String(sheets.length),
      "Rows included": String(totalRows),
      "Daily Khata entries": String(dailyRows.length),
      "Party Khata parties": String(partySummary.length),
      "Cloud path": `shop-backups/${path}`,
      "Local structure": `Shree-Sawariya-Agro-Agency/Khata/Khata-Book.xls + Shree-Sawariya-Agro-Agency/${year}/${month}/${name}`,
    };

    const rawXml = buildRawBackupWorkbook(metadata, sheets);
    const rawBlob = new Blob([rawXml], { type: "application/vnd.ms-excel" });
    const khataXml = buildHumanReadableWorkbookXml(metadata, dailyRows, partySummary);
    const khataBlob = new Blob([khataXml], { type: "application/vnd.ms-excel" });

    await Promise.all([
      saveToLocalFolder(localRootHandle, rawBlob, name, now),
      savePersistentKhataBook(localRootHandle, khataBlob),
    ]);

    const { error: uploadError } = await supabase.storage.from("shop-backups").upload(path, rawBlob, {
      contentType: "application/vnd.ms-excel",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
      .from("backups")
      .update({ size: formatSize(rawBlob.size), status: "completed" })
      .eq("id", backupId);
    if (updateError) throw updateError;

    await shopStore.reload();
    return {
      name,
      rows: totalRows,
      year,
      month,
      dailyEntries: dailyRows.length,
      parties: partySummary.length,
      khataSize: khataBlob.size,
    };
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
    .filter((worksheet) => {
      const name = worksheet.getAttribute("ss:Name") ?? "";
      return backupTables.includes(name as (typeof backupTables)[number]);
    })
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
        toast.error(
          "Your browser does not support selecting a local folder. A supported Chromium browser is required for structured local storage.",
        );
        return;
      }
      setLocalRootHandle(handle);
      toast.success("Local backup folder connected", {
        description: "Backups and the living Khata book will be saved locally under Shree-Sawariya-Agro-Agency.",
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
          description:
            "The backup needs a real local folder so it can create the year/month snapshot and persistent Khata book.",
        });
        return;
      }
      setLocalRootHandle(handle);
      const result = await runManualBackup(handle);
      toast.success("Backup completed", {
        description: `${result.rows.toLocaleString("en-IN")} raw rows saved. Khata book updated to ${result.dailyEntries.toLocaleString("en-IN")} entries across ${result.parties.toLocaleString("en-IN")} parties.`,
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
        description:
          error instanceof Error ? error.message : "Unable to compare the selected backups.",
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
        description="Manual backups create a raw database snapshot plus a local human-readable Khata book for everyday records and disaster recovery."
        actions={
          <>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => void chooseFolder()}
              disabled={selectingFolder || running}
            >
              {selectingFolder ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MapPin className="size-4" />
              )}
              {localRootHandle ? "Local folder connected" : "Choose local folder"}
            </Button>
            <Button className="rounded-full" onClick={() => void handleBackup()} disabled={running}>
              {running ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CloudUpload className="size-4" />
              )}
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
                            className={`border-0 capitalize ${statusStyles[backup.status] ?? ""}`}
                          >
                            {backup.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No backups created yet.
                      </TableCell>
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
            <p>
              Choose a local parent folder in a supported Chromium browser. The backup creates this
              structure automatically:
            </p>
            <pre className="overflow-x-auto rounded-xl bg-muted p-3 text-xs leading-5 text-foreground">{`Shree-Sawariya-Agro-Agency/
  Khata/
    Khata-Book.xls       ← updated living book
  2026/
    September/
      Shree-Sawariya-Agro-Agency-....xls  ← raw snapshot`}</pre>
            <div className="flex items-start gap-2 rounded-xl border bg-background p-3 text-foreground">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium">Khata-Book.xls</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Contains exactly two human-readable sheets: Daily Khata and Party Khata.
                </p>
              </div>
            </div>
            <p>
              {localRootHandle
                ? "Connected. Each backup will append new transaction IDs, update changed transactions, and refresh party balances locally."
                : "Not connected yet. Run backup will ask you to choose the parent folder."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5 shadow-soft">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="font-semibold">What the local book keeps</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Daily Khata is the append-and-update transaction register. Party Khata keeps all
                customers and suppliers together with their current totals, balances, and history.
                It stays local and is never written to a new Supabase table.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit shrink-0 rounded-full">
            Local only · .xls
          </Badge>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitCompare className="size-4 text-primary" /> Compare data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="backup-old-date">
                Older date
              </label>
              <Input
                id="backup-old-date"
                type="date"
                value={oldDate}
                onChange={(event) => setOldDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="backup-new-date">
                Newer date
              </label>
              <Input
                id="backup-new-date"
                type="date"
                value={newDate}
                onChange={(event) => setNewDate(event.target.value)}
              />
            </div>
            <Button
              onClick={() => void handleCompare()}
              disabled={comparing || !oldDate || !newDate}
              className="rounded-full"
            >
              {comparing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GitCompare className="size-4" />
              )}
              {comparing ? "Comparing…" : "Compare data"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            The comparison uses the latest completed raw backup from each selected date and reports
            records that exist in the newer snapshot but not in the older snapshot.
          </p>

          {comparison ? (
            <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Older snapshot</p>
                  <p className="mt-1 truncate text-sm font-semibold">{comparison.oldBackup.name}</p>
                </div>
                <div className="rounded-xl border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Newer snapshot</p>
                  <p className="mt-1 truncate text-sm font-semibold">{comparison.newBackup.name}</p>
                </div>
                <div className="rounded-xl border bg-background p-3">
                  <p className="text-xs text-muted-foreground">New records</p>
                  <p className="mt-1 text-lg font-bold">
                    {comparison.totalNewRows.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {comparison.additions.length ? (
                <div className="space-y-4">
                  {comparison.additions.map((sheet) => {
                    const columns = Array.from(
                      new Set(sheet.rows.flatMap((row) => Object.keys(row))),
                    );
                    return (
                      <div
                        key={sheet.table}
                        className="overflow-hidden rounded-xl border bg-background"
                      >
                        <div className="flex items-center justify-between border-b px-4 py-3">
                          <p className="text-sm font-semibold">{sheet.table}</p>
                          <Badge variant="secondary">{sheet.rows.length} new</Badge>
                        </div>
                        <div className="max-h-80 overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {columns.map((column) => (
                                  <TableHead key={column}>{column}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sheet.rows.map((row, rowIndex) => (
                                <TableRow key={`${sheet.table}-${rowIndex}`}>
                                  {columns.map((column) => (
                                    <TableCell
                                      key={column}
                                      className="max-w-[260px] whitespace-nowrap text-xs"
                                    >
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
            <p className="mt-1 text-sm text-muted-foreground">
              When the admin panel is open at 7:00 AM, the app checks whether today's backup exists
              and asks the owner/admin to save it.
            </p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full">
            Reminder only · no automatic backup
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
