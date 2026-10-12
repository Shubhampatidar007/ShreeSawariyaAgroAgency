/**
 * PWA install prompt hook.
 *
 * Captures the `beforeinstallprompt` event (Chrome/Android/Edge) so the app
 * can show its own install UI instead of the browser's auto-prompt. Also
 * detects iOS Safari (which doesn't fire `beforeinstallprompt` — we show
 * a "Add to Home Screen" hint instead).
 *
 * Dismissals are sticky for 7 days via localStorage so we don't nag users
 * who said "Not now".
 */
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes `navigator.standalone` (boolean) when launched from home screen
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Mac, but lacks beforeinstallprompt — detect via touch.
  const isIPadOS = /Macintosh/.test(ua) && "ontouchend" in document;
  return /iPhone|iPad|iPod/.test(ua) || isIPadOS;
}

export interface PWAInstallState {
  /** True if we should show an install prompt to the user right now. */
  canPrompt: boolean;
  /** True if running as an installed PWA (no prompt needed). */
  isStandalone: boolean;
  /** True on iOS Safari — needs different install instructions. */
  isIOS: boolean;
  /** Triggers the native install prompt. Returns the user's choice. */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  /** Marks the prompt as dismissed — won't show again for 7 days. */
  dismiss: () => void;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone] = useState(isStandalone);
  const [ios] = useState(isIOS);

  useEffect(() => {
    if (standalone) return; // already installed — don't capture

    const handler = (e: Event) => {
      e.preventDefault(); // suppress the browser's auto mini-infobar
      const evt = e as BeforeInstallPromptEvent;
      // Respect the 7-day cooldown if user previously dismissed.
      try {
        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
        if (Date.now() - dismissedAt < COOLDOWN_MS) return;
      } catch {
        // localStorage may be unavailable (private mode) — proceed.
      }
      setDeferredPrompt(evt);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [standalone]);

  // On iOS there's no beforeinstallprompt event, but we still want to show
  // a one-time "Add to Home Screen" hint — so canPrompt is true if we're
  // on iOS and not yet standalone (subject to the same 7-day cooldown).
  const cooldownActive = (() => {
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      return Date.now() - dismissedAt < COOLDOWN_MS;
    } catch {
      return false;
    }
  })();

  const canPrompt =
    !standalone && !cooldownActive && (!!deferredPrompt || (ios && !standalone));

  const promptInstall = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome;
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore storage errors
    }
    setDeferredPrompt(null);
  };

  return { canPrompt, isStandalone, isIOS: ios, promptInstall, dismiss };
}
