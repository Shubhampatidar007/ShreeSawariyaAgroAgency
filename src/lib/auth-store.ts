import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ShopUser = {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  village?: string;
  role: "admin" | "staff" | "customer";
};

let user: ShopUser | null = null;
let ready = false;
let started = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => user;
const getServerSnapshot = () => null;
const getReady = () => ready;
const getReadyServer = () => false;

async function hydrate(userId: string, email: string) {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, mobile, village").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const roleList = (roles ?? []).map((r) => r.role);
  user = {
    id: userId,
    email,
    name: profile?.full_name || email.split("@")[0] || "User",
    ...(profile?.mobile ? { mobile: profile.mobile } : {}),
    ...(profile?.village ? { village: profile.village } : {}),
    role: roleList.includes("admin") ? "admin" : roleList.includes("staff") ? "staff" : "customer",
  };
  emit();
}

export function initAuth() {
  if (typeof window === "undefined" || started) return;
  started = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      void hydrate(session.user.id, session.user.email ?? "");
    } else {
      user = null;
      emit();
    }
  });

  void supabase.auth.getSession().then(async ({ data }) => {
    if (data.session?.user) {
      await hydrate(data.session.user.id, data.session.user.email ?? "");
    }
    ready = true;
    emit();
  });
}

export const authStore = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { ok: false as const, error: error?.message ?? "Unable to sign in." };
    }
    await hydrate(data.user.id, data.user.email ?? email);
    return { ok: true as const, user: user! };
  },
  async register(input: {
    email: string;
    password: string;
    name: string;
    mobile?: string;
    village?: string;
  }) {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: input.name, mobile: input.mobile, village: input.village },
      },
    });
    if (error) return { ok: false as const, error: error.message };
    if (!data.session) {
      return { ok: false as const, error: "Check your email to confirm the account." };
    }
    await hydrate(data.user!.id, data.user!.email ?? input.email);
    return { ok: true as const, user: user! };
  },
  async logout() {
    await supabase.auth.signOut();
    user = null;
    emit();
  },
};

export function useAuth() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useAuthReady() {
  return useSyncExternalStore(subscribe, getReady, getReadyServer);
}