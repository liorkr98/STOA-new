import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Instrument / ETF / sector / theme follows (backend brief item 5). Owner-only
 * via RLS, so every function here is implicitly scoped to the session user.
 */

export type FollowKind = "ticker" | "etf" | "sector" | "theme";

export const FOLLOW_KINDS: FollowKind[] = ["ticker", "etf", "sector", "theme"];

export interface InstrumentFollow {
  kind: FollowKind;
  symbol: string;
}

/** Symbols are uppercased; sector and theme labels keep their casing. */
export function normalizeFollowSymbol(kind: FollowKind, symbol: string): string {
  const trimmed = symbol.trim();
  return kind === "ticker" || kind === "etf" ? trimmed.toUpperCase() : trimmed;
}

export async function listInstrumentFollows(kind?: FollowKind): Promise<InstrumentFollow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("follows_instruments")
    .select("kind, symbol")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (kind) query = query.eq("kind", kind);

  const { data } = await query;
  return (data as InstrumentFollow[] | null) ?? [];
}

/** All follows grouped by kind, for surfaces that need more than one list. */
export async function listInstrumentFollowsByKind(): Promise<Record<FollowKind, string[]>> {
  const rows = await listInstrumentFollows();
  const out: Record<FollowKind, string[]> = { ticker: [], etf: [], sector: [], theme: [] };
  for (const row of rows) out[row.kind]?.push(row.symbol);
  return out;
}

export async function followInstrument(
  kind: FollowKind,
  symbol: string,
): Promise<{ ok: boolean; error?: string }> {
  const value = normalizeFollowSymbol(kind, symbol);
  if (!value) return { ok: false, error: "symbol required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to continue" };

  const { error } = await supabase
    .from("follows_instruments")
    .upsert(
      { owner_id: user.id, kind, symbol: value },
      { onConflict: "owner_id,kind,symbol", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unfollowInstrument(
  kind: FollowKind,
  symbol: string,
): Promise<{ ok: boolean; error?: string }> {
  const value = normalizeFollowSymbol(kind, symbol);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to continue" };

  const { error } = await supabase
    .from("follows_instruments")
    .delete()
    .eq("owner_id", user.id)
    .eq("kind", kind)
    .eq("symbol", value);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Max rows accepted in a one-time import from a browser-local list. */
export const IMPORT_LIMIT = 200;

/**
 * One-time migration of a reader's localStorage watchlist. Additive and
 * idempotent: it never removes a server-side follow, so running it twice (or on
 * two devices with different local lists) merges rather than clobbers.
 */
export async function importInstrumentFollows(
  items: InstrumentFollow[],
): Promise<{ ok: boolean; imported: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, imported: 0, error: "Sign in to continue" };

  const seen = new Set<string>();
  const rows: { owner_id: string; kind: FollowKind; symbol: string }[] = [];
  for (const item of items.slice(0, IMPORT_LIMIT)) {
    if (!FOLLOW_KINDS.includes(item.kind)) continue;
    const symbol = normalizeFollowSymbol(item.kind, item.symbol ?? "");
    if (!symbol) continue;
    const key = `${item.kind}:${symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ owner_id: user.id, kind: item.kind, symbol });
  }

  if (rows.length === 0) return { ok: true, imported: 0 };

  const { error } = await supabase
    .from("follows_instruments")
    .upsert(rows, { onConflict: "owner_id,kind,symbol", ignoreDuplicates: true });
  if (error) return { ok: false, imported: 0, error: error.message };
  return { ok: true, imported: rows.length };
}
