/**
 * Premium splash screen for the Shree Sawariya Agro Agency PWA.
 *
 * Shows only on initial app load (guarded by sessionStorage — doesn't
 * replay on navigation or reloads within the same session). Uses CSS
 * animations for lightweight performance (no video, no JS animation libs).
 *
 * Animation phases (2.5s total):
 * 1. (0–0.6s)  Logo icon scales in from 0.8 → 1.0 + fades in
 * 2. (0.6–1.2s) Brand name "Shree Sanwariya Agro Agency" fades in
 * 3. (1.2–1.8s) Subtitle "Agriculture Shop Management" fades in
 * 4. (1.8–2.5s) Entire splash fades out → content revealed
 *
 * Respects `prefers-reduced-motion: reduce` — skips animation, shows
 * static logo + brand name for 0.5s then hides.
 */
import { useEffect, useState } from "react";

const SPLASH_KEY = "splash-shown";
const SPLASH_DURATION = 2500; // ms
const SPLASH_DURATION_REDUCED = 500; // ms

export function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show on server-side render
    if (typeof window === "undefined") return;

    // Don't show again in the same session (already loaded)
    if (sessionStorage.getItem(SPLASH_KEY)) return;

    // Mark as shown immediately
    sessionStorage.setItem(SPLASH_KEY, "1");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? SPLASH_DURATION_REDUCED : SPLASH_DURATION;

    setVisible(true);
    const t = setTimeout(() => setVisible(false), duration);

    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background ${reduced ? "" : "splash-fadeout"}`}
      style={{
        // CSS custom properties for the animation delays — overridden by
        // the splash-fadeout class. When reduced motion is on, we skip
        // the animation entirely.
        animationDuration: reduced ? "0s" : undefined,
      }}
    >
      {/* Logo icon — emerald green rounded box with Sprout icon */}
      <div
        className={`flex size-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft ${reduced ? "" : "splash-logo-reveal"}`}
      >
        {/* Using the existing Sprout lucide icon as inline SVG to avoid
            import overhead during the critical loading path */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Sprout icon path — same as lucide-react Sprout */}
          <path d="M7 20h10" />
          <path d="M10 20c5.5-2.5.8-6.4 3-10" />
          <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
          <path d="M14.1 6c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
        </svg>
      </div>

      {/* Brand name */}
      <h1
        className={`mt-5 font-display text-xl font-bold tracking-tight text-foreground ${reduced ? "" : "splash-brand-reveal"}`}
      >
        Shree Sanwariya Agro Agency
      </h1>

      {/* Subtitle */}
      <p
        className={`mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground ${reduced ? "" : "splash-subtitle-reveal"}`}
      >
        Agriculture Shop Management
      </p>

      {/* Subtle loading bar */}
      {!reduced && (
        <div className="mt-6 h-0.5 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full origin-left rounded-full bg-gradient-to-r from-primary to-brand-lime splash-loading-bar" />
        </div>
      )}
    </div>
  );
}
