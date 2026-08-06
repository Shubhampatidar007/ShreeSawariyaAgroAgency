import { useCallback, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "agrikisan-theme";

let mode: ThemeMode = "system";
let resolved: ResolvedTheme = "light";
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply() {
  if (typeof document === "undefined") return;
  resolved = mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;
  const root = document.documentElement;
  root.classList.add("theme-transition");
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  window.setTimeout(() => root.classList.remove("theme-transition"), 320);
}

export function setThemeMode(next: ThemeMode) {
  mode = next;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
  apply();
  emit();
}

export function initTheme() {
  if (typeof window === "undefined") return;
  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  mode = stored ?? "system";
  apply();
  emit();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (mode === "system") {
      apply();
      emit();
    }
  });
}

const snapshot = () => `${mode}:${resolved}`;

export function useTheme() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "system:light");
  const [currentMode, currentResolved] = value.split(":") as [ThemeMode, ResolvedTheme];

  const toggleTheme = useCallback(() => {
    setThemeMode(currentResolved === "dark" ? "light" : "dark");
  }, [currentResolved]);

  return {
    mode: currentMode,
    theme: currentResolved,
    resolvedTheme: currentResolved,
    setThemeMode,
    toggleTheme,
  };
}
