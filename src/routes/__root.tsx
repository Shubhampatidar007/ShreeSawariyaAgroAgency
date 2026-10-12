import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useEffect, useRef, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { initTheme } from "@/hooks/use-theme";
import { initLanguage } from "@/lib/i18n";
import { initAuth, useAuth, useAuthReady } from "@/lib/auth-store";
import { initCart } from "@/lib/cart-store";
import { initPublicShopData } from "@/lib/public-shop-store";
import { SmoothScroll } from "@/components/SmoothScroll";
import { registerPWA } from "@/lib/pwa";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { Home, RefreshCw, AlertTriangle, Compass } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 safe-top safe-bottom">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center shadow-soft">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Compass className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-6xl font-bold tracking-tight text-foreground">404</h1>
        <h2 className="mt-2 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 safe-top safe-bottom">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center shadow-soft">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        {import.meta.env.DEV && error?.message ? (
          <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      // viewport-fit=cover enables safe-area-inset CSS env vars for notched devices.
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Shree Sanwariya Agro Agency" },
      {
        name: "description",
        content:
          "A storefront and shop management platform for managing Shree Sanwariya Agro Agency.",
      },
      // PWA / mobile meta.
      // NOTE: theme-color is intentionally NOT in this array — TanStack Router's
      // HeadContent dedupes meta tags by `name`, which strips one of the two
      // theme-color variants (light vs dark) we need. They are rendered directly
      // in <head> in RootShell below to bypass the dedupe.
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Shree Sawariya" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "Shree Sanwariya Agro Agency" },
      {
        property: "og:description",
        content:
          "A storefront and shop management platform for managing Shree Sanwariya Agro Agency.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.jpg", type: "image/jpeg" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700&family=Nunito:wght@400;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Theme-color split for light/dark so the Android status bar matches
            the body background (white in light, black in dark) instead of the
            emerald green brand color (which clashed with the white body).
            Rendered directly here (not via TanStack head().meta) to avoid
            HeadContent's name-based dedupe stripping one of the two tags. */}
        <meta
          name="theme-color"
          content="#ffffff"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#000000"
          media="(prefers-color-scheme: dark)"
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const authReady = useAuthReady();
  const authUser = useAuth();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    initTheme();
    initLanguage();
    initAuth();
    initCart();
    initPublicShopData();
    // Register service worker — no-op on server (guard inside registerPWA)
    // and on browsers without SW support.
    registerPWA();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    previousUserId.current = authUser?.id ?? null;
  }, [authReady, authUser?.id]);

  return (
    <QueryClientProvider client={queryClient}>
      <SmoothScroll />
      <Outlet />
      <PWAInstallPrompt />
      <Toaster />
      <Analytics />
      <SpeedInsights />
    </QueryClientProvider>
  );
}
