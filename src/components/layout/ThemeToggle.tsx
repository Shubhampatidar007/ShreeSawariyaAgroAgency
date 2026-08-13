import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label="Toggle colour theme"
      onClick={toggleTheme}
    >
      {theme === "dark" ? (
        <Sun className="size-5 transition-transform duration-300 hover:rotate-12" />
      ) : (
        <Moon className="size-5 transition-transform duration-300 hover:-rotate-12" />
      )}
    </Button>
  );
}
