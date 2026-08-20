import { CheckCircle2, Database, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminDataLoaderProps = {
  error?: string | null;
  onRetry?: () => void;
};

export function AdminDataLoader({ error = null, onRetry }: AdminDataLoaderProps) {
  if (error) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-[10%] top-[15%] h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-[10%] right-[10%] h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md text-center">
          <div className="mx-auto mb-7 flex size-24 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10">
            <Database className="size-10 text-destructive" />
          </div>

          <h1 className="font-display text-2xl font-bold">We couldn't load your shop</h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your login is fine, but the shop data could not be loaded. Please try again.
          </p>

          <p className="mt-3 break-words rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            {error}
          </p>

          {onRetry && (
            <Button onClick={onRetry} className="mt-6 rounded-full px-6">
              <RefreshCw className="mr-2 size-4" />
              Try again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-7 text-center shadow-soft">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Loader2
            className="size-7 animate-spin text-primary"
            style={{ animationDuration: "1.25s" }}
          />
        </div>

        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">Preparing your shop</h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Getting your dashboard, inventory and business data ready.
        </p>

        <div className="mx-auto mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/5 animate-pulse rounded-full bg-primary" />
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-primary" />
          <span>Securely connected to your shop</span>
        </div>
      </div>
    </div>
  );
}
