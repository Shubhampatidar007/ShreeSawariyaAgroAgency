import { useRef } from "react";
import { Download, FileSpreadsheet, FileText, Sheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";

type ExportFormat = "PDF" | "CSV" | "Excel";
type ExportTable = string[][];

const formats: { key: ExportFormat; icon: typeof FileText }[] = [
  { key: "PDF", icon: FileText },
  { key: "CSV", icon: Sheet },
  { key: "Excel", icon: FileSpreadsheet },
];

function cleanCell(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function readPageTables(trigger: HTMLElement): ExportTable[] {
  const root = trigger.closest("main") ?? document.body;
  const tables = Array.from(root.querySelectorAll("table"));

  return tables
    .map((table) => {
      const rows = Array.from(table.rows).map((row) =>
        Array.from(row.cells).map((cell) => cleanCell(cell.innerText)),
      );
      const header = rows[0] ?? [];
      const excludedColumns = header.reduce<number[]>((indexes, value, index) => {
        if (/^(actions?|action)$/i.test(value)) indexes.push(index);
        return indexes;
      }, []);

      return rows.map((row) => row.filter((_, index) => !excludedColumns.includes(index)));
    })
    .filter((rows) => rows.some((row) => row.some(Boolean)));
}

function getPageTitle(trigger: HTMLElement) {
  const root = trigger.closest("main") ?? document.body;
  return cleanCell(root.querySelector("h1")?.textContent ?? document.title ?? "Export") || "Export";
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "export";
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCsv(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function exportCsv(tables: ExportTable[], filename: string) {
  const sections = tables.map((rows, index) => {
    const section = tables.length > 1 ? [[`Table ${index + 1}`], [""]] : [];
    return [...section, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  });
  downloadBlob(`\uFEFF${sections.join("\n\n")}`, `${filename}.csv`, "text/csv;charset=utf-8");
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  };
  return value.replace(/[&<>\"]/g, (character) => entities[character] ?? character);
}

function renderTables(tables: ExportTable[]) {
  return tables
    .map(
      (rows) =>
        `<table>${rows
          .map(
            (row, rowIndex) =>
              `<tr>${row
                .map((cell) => (rowIndex === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`))
                .join("")}</tr>`,
          )
          .join("")}</table>`,
    )
    .join("");
}

function exportExcel(tables: ExportTable[], title: string, filename: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif}h1{font-size:18px}table{border-collapse:collapse;margin:0 0 24px}th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left}th{font-weight:700;background:#f3f4f6}</style></head><body><h1>${escapeHtml(title)}</h1>${renderTables(tables)}</body></html>`;
  downloadBlob(`\uFEFF${html}`, `${filename}.xls`, "application/vnd.ms-excel;charset=utf-8");
}

function exportPdf(tables: ExportTable[], title: string) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) return false;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:auto;margin:14mm}body{font-family:Arial,sans-serif;color:#111827}h1{font-size:20px;margin:0 0 6px}p{font-size:11px;color:#6b7280;margin:0 0 18px}table{width:100%;border-collapse:collapse;margin:0 0 24px;font-size:11px}th,td{border:1px solid #d1d5db;padding:6px 7px;text-align:left;vertical-align:top}th{background:#f3f4f6;font-weight:700}tr{break-inside:avoid}</style></head><body><h1>${escapeHtml(title)}</h1><p>Exported ${escapeHtml(new Date().toLocaleString("en-IN"))}</p>${renderTables(tables)}</body></html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
  return true;
}

export function ExportMenu({ label, size = "sm" }: { label?: string; size?: "sm" | "default" }) {
  const { t } = useI18n();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleExport = (format: ExportFormat) => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const tables = readPageTables(trigger);
    const title = getPageTitle(trigger);
    const filename = safeFilename(title);

    if (!tables.length) {
      toast.error("There is no tabular data available to export on this page.");
      return;
    }

    try {
      if (format === "CSV") exportCsv(tables, filename);
      if (format === "Excel") exportExcel(tables, title, filename);
      if (format === "PDF" && !exportPdf(tables, title)) {
        toast.error("Unable to open the PDF print window. Please allow pop-ups and try again.");
        return;
      }
      toast.success(`${format} export created`, {
        description: `${tables.length} table${tables.length === 1 ? "" : "s"} exported from ${title}.`,
      });
    } catch (error) {
      console.error("Export failed", error);
      toast.error(`${format} export failed`, { description: "Please try again." });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="outline" size={size} className="rounded-full">
          <Download className="size-4" />
          {label ?? t("common.export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("common.export")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {formats.map((format) => (
          <DropdownMenuItem key={format.key} onClick={() => handleExport(format.key)}>
            <format.icon className="size-4" /> {format.key}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
