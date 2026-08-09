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

const formats = [
  { key: "PDF", icon: FileText },
  { key: "CSV", icon: Sheet },
  { key: "Excel", icon: FileSpreadsheet },
];

export function ExportMenu({ label, size = "sm" }: { label?: string; size?: "sm" | "default" }) {
  const { t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className="rounded-full">
          <Download className="size-4" />
          {label ?? t("common.export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("common.export")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {formats.map((format) => (
          <DropdownMenuItem
            key={format.key}
            onClick={() =>
              toast.info(t("common.exportQueued"), {
                description: t("common.exportDescription"),
              })
            }
          >
            <format.icon className="size-4" /> {format.key}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
