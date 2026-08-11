import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  Loader2,
  Package,
  RefreshCw,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminDataLoaderProps = {
  error?: string | null;
  onRetry?: () => void;
};

const stages = [
  {
    icon: ShieldCheck,
    title: "Securing your session",
    description: "Verifying your shop access...",
  },
  {
    icon: Database,
    title: "Connecting to your shop",
    description: "Establishing a secure data connection...",
  },
  {
    icon: Users,
    title: "Loading customers",
    description: "Preparing customer and ledger records...",
  },
  {
    icon: Package,
    title: "Loading inventory",
    description: "Preparing products and stock information...",
  },
  {
    icon: Sprout,
    title: "Preparing your dashboard",
    description: "Almost ready...",
  },
];

export function AdminDataLoader({
  error = null,
  onRetry,
}: AdminDataLoaderProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (error) return;

    const interval = window.setInterval(() => {
      setStage((current) => (current + 1) % stages.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [error]);

  const currentStage = stages[stage];
  const StageIcon = currentStage.icon;

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

          <h1 className="font-display text-2xl font-bold">
            We couldn't load your shop
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your login is fine, but the shop data could not be loaded.
            Please try again.
          </p>

          <p className="mt-3 break-words rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            {error}
          </p>

          {onRetry && (
            <Button
              onClick={onRetry}
              className="mt-6 rounded-full px-6"
            >
              <RefreshCw className="mr-2 size-4" />
              Try again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      {/* Ambient background */}
      <div className="absolute inset-0">
        <div className="absolute left-[8%] top-[12%] h-52 w-52 animate-pulse rounded-full bg-primary/10 blur-3xl" />
        <div
          className="absolute bottom-[8%] right-[8%] h-72 w-72 animate-pulse rounded-full bg-blue-500/10 blur-3xl"
          style={{ animationDelay: "700ms" }}
        />
        <div
          className="absolute left-[45%] top-[55%] h-40 w-40 animate-pulse rounded-full bg-emerald-500/5 blur-3xl"
          style={{ animationDelay: "1200ms" }}
        />
      </div>

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className="absolute size-1.5 animate-pulse rounded-full bg-primary/30"
            style={{
              left: `${(index * 17 + 5) % 95}%`,
              top: `${(index * 29 + 8) % 90}%`,
              animationDelay: `${index * 140}ms`,
              animationDuration: `${1800 + (index % 4) * 500}ms`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Main animated logo */}
        <div className="relative mx-auto mb-10 size-36">
          <div className="absolute inset-0 animate-ping rounded-full border border-primary/10" />

          <div
            className="absolute inset-2 animate-spin rounded-full border border-transparent border-t-primary/60 border-r-primary/20"
            style={{ animationDuration: "2.8s" }}
          />

          <div
            className="absolute inset-5 animate-spin rounded-full border border-transparent border-b-emerald-500/50 border-l-primary/30"
            style={{
              animationDuration: "2s",
              animationDirection: "reverse",
            }}
          />

          <div className="absolute inset-8 flex items-center justify-center rounded-full bg-primary/10 shadow-[0_0_60px_rgba(34,197,94,0.15)]">
            <Sprout className="size-12 animate-pulse text-primary" />
          </div>

          <div className="absolute -right-1 top-3 flex size-8 animate-bounce items-center justify-center rounded-full border bg-background shadow-lg">
            <Database className="size-4 text-primary" />
          </div>

          <div className="absolute -bottom-1 left-1 flex size-8 animate-bounce items-center justify-center rounded-full border bg-background shadow-lg [animation-delay:400ms]">
            <Package className="size-4 text-primary" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          Preparing your shop
        </h1>

        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          We're getting your dashboard, inventory and business data ready.
        </p>

        {/* Current stage */}
        <div className="mt-8 rounded-2xl border bg-card/70 p-5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-4 text-left">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <StageIcon className="size-5 animate-pulse text-primary" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold">{currentStage.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {currentStage.description}
              </p>
            </div>

            <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
          </div>

          {/* Animated progress */}
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full w-1/3 rounded-full bg-primary"
              style={{
                animation: "admin-loader-progress 1.5s ease-in-out infinite",
              }}
            />
          </div>

          {/* Stage indicators */}
          <div className="mt-5 flex justify-center gap-2">
            {stages.map((_, index) => (
              <span
                key={index}
                className={[
                  "h-1.5 rounded-full transition-all duration-500",
                  index === stage
                    ? "w-7 bg-primary"
                    : index < stage
                      ? "w-2 bg-primary/50"
                      : "w-2 bg-muted",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        {/* Small status */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-primary" />
          <span>Your data stays securely connected to your shop</span>
        </div>
      </div>

      <style>{`
        @keyframes admin-loader-progress {
          0% {
            transform: translateX(-120%);
          }
          50% {
            transform: translateX(120%);
          }
          100% {
            transform: translateX(350%);
          }
        }
      `}</style>
    </div>
  );
}