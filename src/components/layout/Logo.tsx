import { Link } from "@tanstack/react-router";
import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoProps = {
  to?: string;
  className?: string;
  subtitle?: string;
  inverted?: boolean;
};

export function Logo({
  to = "/",
  className,
  subtitle = "Agriculture Shop Management",
  inverted,
}: LogoProps) {
  return (
    <Link to={to} className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <Sprout className="size-5" />
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block font-display text-base font-semibold tracking-tight",
            inverted ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Shree Sawariya Agro Agency
        </span>
        <span
          className={cn(
            "block text-[11px] font-medium uppercase tracking-widest",
            inverted ? "text-sidebar-foreground/60" : "text-muted-foreground",
          )}
        >
          {subtitle}
        </span>
      </span>
    </Link>
  );
}
