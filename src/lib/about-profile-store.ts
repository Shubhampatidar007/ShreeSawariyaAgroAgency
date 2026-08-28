import { useSyncExternalStore } from "react";
import type { AboutProfile } from "@/types/about";

const STORAGE_KEY = "shree-sawariya-about-profile";

const initialProfile: AboutProfile = {
  name: "Shree Sawariya Agro Agency",
  role: "Agricultural supplies & local service",
  bio: "A dependable local agro-agency focused on practical products, clear availability and farmer support.",
  contact: "",
  photoUrl: "",
};

let profile = initialProfile;
const listeners = new Set<() => void>();
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) profile = { ...initialProfile, ...(JSON.parse(raw) as Partial<AboutProfile>) };
  } catch {
    profile = initialProfile;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

export const aboutProfileStore = {
  getProfile() {
    hydrate();
    return profile;
  },
  subscribe(listener: () => void) {
    hydrate();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setProfile(next: AboutProfile) {
    profile = next;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Browser storage is optional; keep the in-memory state.
      }
    }
    emit();
  },
};

export function useAboutProfile() {
  return useSyncExternalStore(aboutProfileStore.subscribe, aboutProfileStore.getProfile, () => initialProfile);
}
