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
  const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, mobile, village").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

  if (profileError || rolesError) {
    throw new Error(
      profileError?.message ?? rolesError?.message ?? "Unable to load your account data.",
    );
  }

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
    if (!session?.user) {
      user = null;
      emit();
    }
    // Signed-in users are hydrated by login/register/getSession below.
    // Auth token refreshes do not require another profile/role database query.
  });

  void supabase.auth.getSession().then(async ({ data, error }) => {
    if (error) {
      console.error("[Auth] Failed to restore session:", error);
    } else if (data.session?.user) {
      try {
        await hydrate(data.session.user.id, data.session.user.email ?? "");
      } catch (hydrateError) {
        console.error("[Auth] Failed to hydrate account data:", hydrateError);
        user = null;
      }
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

    try {
      await hydrate(data.user.id, data.user.email ?? email);
    } catch (hydrateError) {
      await supabase.auth.signOut();
      return {
        ok: false as const,
        error:
          hydrateError instanceof Error
            ? hydrateError.message
            : "Unable to load your account data.",
      };
    }

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

    try {
      await hydrate(data.user!.id, data.user!.email ?? input.email);
    } catch (hydrateError) {
      await supabase.auth.signOut();
      return {
        ok: false as const,
        error:
          hydrateError instanceof Error
            ? hydrateError.message
            : "Unable to load your account data.",
      };
    }

    return { ok: true as const, user: user! };
  },
  async updateProfile(input: { name: string; mobile?: string; village?: string }) {
    if (!user) return { ok: false as const, error: "You must be signed in." };
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: input.name.trim(),
        mobile: input.mobile?.trim() || null,
        village: input.village?.trim() || null,
      })
      .eq("id", user.id);
    if (error) return { ok: false as const, error: error.message };
    await hydrate(user.id, user.email);
    return { ok: true as const, user: user! };
  },
  async changePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
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
