import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Browser-safe Supabase project configuration.
// Environment variables take priority; the public fallback keeps the local/GitHub
// build connected when no .env file is present.
const DEFAULT_SUPABASE_URL = 'https://yqaiffjxprmwerdoufke.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_4VzGDmax-6XyPaW1NomaNQ_kotGVa9i';

function createSupabaseClient() {
  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL ||
    (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined) ||
    DEFAULT_SUPABASE_URL;

  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (typeof process !== 'undefined' ? process.env.SUPABASE_PUBLISHABLE_KEY : undefined) ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
