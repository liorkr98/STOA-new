import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  importInstrumentFollows,
  listInstrumentFollowsByKind,
  type InstrumentFollow,
} from "@/lib/db/follows-instruments";

export const dynamic = "force-dynamic";

/**
 * The reader's instrument follows (backend brief item 5). Returns
 * `signedIn: false` with empty lists for a guest, so the client can keep using
 * its localStorage fallback without branching on auth itself.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      signedIn: false,
      ticker: [],
      etf: [],
      sector: [],
      theme: [],
    });
  }

  const byKind = await listInstrumentFollowsByKind();
  return NextResponse.json({ signedIn: true, ...byKind });
}

/** One-time import of a browser-local watchlist. Additive, never destructive. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { items?: unknown } | null;
  const raw = Array.isArray(body?.items) ? body!.items : null;
  if (!raw) return NextResponse.json({ error: "items array required" }, { status: 400 });

  const items: InstrumentFollow[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.kind !== "string" || typeof e.symbol !== "string") continue;
    items.push({ kind: e.kind as InstrumentFollow["kind"], symbol: e.symbol });
  }

  const result = await importInstrumentFollows(items);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
