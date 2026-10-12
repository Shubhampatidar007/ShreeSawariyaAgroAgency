/**
 * PWA install prompt UI.
 *
 * Renders nothing visually — instead, fires a Sonner toast when the user
 * is eligible to install the app. Two paths:
 *
 * - Android Chrome / Edge: captures `beforeinstallprompt`, shows a toast
 *   with an "Install" button that triggers the native install prompt.
 * - iOS Safari: shows a one-time hint to use Share → "Add to Home Screen"
 *   (iOS doesn't support `beforeinstallprompt`).
 *
 * Once the app is launched as a PWA (standalone mode), or the user has
 * dismissed the prompt within the last 7 days, no toast appears.
 *
 * Mounted once in `src/routes/__root.tsx` RootComponent.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Download, Share } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export function PWAInstallPrompt() {
  const { canPrompt, isStandalone, isIOS, promptInstall, dismiss } = usePWAInstall();
  const shownRef = useRef(false);

  useEffect(() => {
    if (isStandalone) return;
    if (!canPrompt) return;
    if (shownRef.current) return;
    shownRef.current = true;

    // Delay 3s so the toast doesn't fight with auth/cart/storefront init toasts.
    const t = setTimeout(() => {
      if (isIOS) {
        toast("Install Shree Sawariya", {
          description:
            "Tap the Share icon in the toolbar, then choose 'Add to Home Screen'.",
          duration: 12000,
          icon: <Share className="h-4 w-4" />,
          action: {
            label: "Got it",
            onClick: () => dismiss(),
          },
        });
      } else {
        toast("Install Shree Sawariya", {
          description: "Add the app to your home screen for fast, offline access.",
          duration: 0, // sticky until user interacts
          icon: <Download className="h-4 w-4" />,
          action: {
            label: "Install",
            onClick: async () => {
              const result = await promptInstall();
              if (result !== "accepted") dismiss();
            },
          },
          cancel: {
            label: "Not now",
            onClick: () => dismiss(),
          },
        });
      }
    }, 3000);

    return () => clearTimeout(t);
  }, [canPrompt, isStandalone, isIOS, promptInstall, dismiss]);

  return null;
}
