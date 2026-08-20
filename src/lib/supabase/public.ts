import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Anon Supabase client with no cookies and no session.
 *
 * Public catalog reads (published reports, tickers, coverage RPCs) do not need
 * the visitor's session. Using this instead of the cookie-bound server client
 * means those reads can run inside Next's data cache: `cookies()` inside a
 * cached function would opt the whole computation out of caching.
 *
 * Never use this for anything that depends on `auth.uid()` RLS (drafts, wallet,
 * saved items, paywalled bodies).
 */

let client: SupabaseClient | null = null;

export function createPublicClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
