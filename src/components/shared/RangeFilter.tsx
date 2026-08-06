import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type DateRangeKey = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export type CustomRange = { from: string; to: string };

type RangeFilterProps = {
  value: DateRangeKey;
  onChange: (value: DateRangeKey) => void;
  custom: CustomRange;
  onCustomChange: (range: CustomRange) => void;
  className?: string;
};

const options: DateRangeKey[] = ["daily", "weekly", "monthly", "yearly"];

export function RangeFilter({
  value,
  onChange,
  custom,
  onCustomChange,
  className,
}: RangeFilterProps) {
  const { t } = useI18n();

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-muted/60 p-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              value === option
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`range.${option}`)}
          </button>
        ))}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={value === "custom" ? "default" : "outline"}
            size="sm"
            className="rounded-full"
          >
            <CalendarRange className="size-4" />
            {t("range.custom")}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <p className="text-sm font-semibold">{t("range.custom")}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="range-from">
                From
              </label>
              <Input
                id="range-from"
                type="date"
                value={custom.from}
                onChange={(e) => onCustomChange({ ...custom, from: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="range-to">
                To
              </label>
              <Input
                id="range-to"
                type="date"
                value={custom.to}
                onChange={(e) => onCustomChange({ ...custom, to: e.target.value })}
              />
            </div>
          </div>
          <Button size="sm" className="w-full rounded-full" onClick={() => onChange("custom")}>
            Apply range
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
