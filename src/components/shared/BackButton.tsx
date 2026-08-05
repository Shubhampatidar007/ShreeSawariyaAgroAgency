import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackButton({ label = "Back", className }: { label?: string; className?: string }) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "-ml-2 gap-1.5 rounded-full text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={() => router.history.back()}
    >
      <ArrowLeft className="size-4" />
      {label}
    </Button>
  );
}