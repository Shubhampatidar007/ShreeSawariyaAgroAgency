import { useCallback, useSyncExternalStore } from "react";
import { en, type TranslationKey } from "./en";
import { hi } from "./hi";

export type Language = "en" | "hi";

export const languages: { code: Language; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "hi", label: "हिन्दी", short: "हि" },
];

/**
 * Central translation registry. Adding a new locale only requires adding a
 * dictionary here — components never change.
 */
const dictionaries: Record<Language, Partial<Record<TranslationKey, string>>> = {
  en,
  hi,
};

const STORAGE_KEY = "agrikisan-language";

let language: Language = "en";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLanguage(next: Language) {
  language = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }
  emit();
}

export function initLanguage() {
  if (typeof window === "undefined") return;
  const stored = window.localStorage.getItem(STORAGE_KEY) as Language | null;
  if (stored && stored !== language) setLanguage(stored);
  else document.documentElement.lang = language;
}

export function translate(key: TranslationKey | string, lang: Language = language) {
  const dict = dictionaries[lang] as Record<string, string | undefined>;
  return dict[key] ?? (en as Record<string, string | undefined>)[key] ?? key;
}

export function useI18n() {
  const current = useSyncExternalStore(
    subscribe,
    () => language,
    () => "en" as Language,
  );

  const t = useCallback(
    (key: TranslationKey | string, fallback?: string) => {
      const value = translate(key, current);
      return value === key && fallback ? fallback : value;
    },
    [current],
  );

  const toggleLanguage = useCallback(
    () => setLanguage(current === "en" ? "hi" : "en"),
    [current],
  );

  return { language: current, setLanguage, toggleLanguage, t };
}
