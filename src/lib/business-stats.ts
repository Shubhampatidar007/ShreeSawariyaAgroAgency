import { supabase } from "@/integrations/supabase/client";

export type BusinessStats = {
  yearsInBusiness: number;
  customersServed: number;
  servicesOffered: number;
};

const DEFAULT_SUPABASE_URL = "https://cmfqlpcrnkswgxrszoog.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4VzGDmax-6XyPaW1NomaNQ_kotGVa9i";

const getConfig = () => ({
  url:
    import.meta.env.VITE_SUPABASE_URL ||
    (typeof process !== "undefined" ? process.env.SUPABASE_URL : undefined) ||
    DEFAULT_SUPABASE_URL,
  key:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (typeof process !== "undefined" ? process.env.SUPABASE_PUBLISHABLE_KEY : undefined) ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY,
});

export async function getBusinessStats(): Promise<BusinessStats> {
  const { url, key } = getConfig();
  const response = await fetch(
    `${url}/rest/v1/business_stats?id=eq.1&select=years_in_business,customers_served,services_offered`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Unable to load business stats");
  }

  const rows = (await response.json()) as Array<{
    years_in_business?: number;
    customers_served?: number;
    services_offered?: number;
  }>;
  const row = rows[0];

  return {
    yearsInBusiness: Number(row?.years_in_business ?? 0),
    customersServed: Number(row?.customers_served ?? 0),
    servicesOffered: Number(row?.services_offered ?? 0),
  };
}

export async function updateBusinessStats(stats: BusinessStats) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.access_token) throw new Error("You must be signed in.");

  const { url, key } = getConfig();
  const response = await fetch(`${url}/rest/v1/business_stats?id=eq.1`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      years_in_business: stats.yearsInBusiness,
      customers_served: stats.customersServed,
      services_offered: stats.servicesOffered,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to save business stats");
  }
}
