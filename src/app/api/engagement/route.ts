import { NextResponse } from "next/server";
import {
  ENGAGEMENT_BATCH_LIMIT,
  ENGAGEMENT_KINDS,
  recordEngagementEvents,
  type EngagementEventInput,
  type EngagementKind,
} from "@/lib/db/engagement";

export const dynamic = "force-dynamic";

/**
 * Batched engagement ingest (backend brief item 4). The client accumulates
 * events in memory and posts an array on idle or page-hide, so a scroll session
 * is one request rather than one per event. Logged-out readers are allowed:
 * impressions and plays are worth counting anonymously.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { events?: unknown } | null;
  const raw = Array.isArray(body?.events) ? body!.events : null;
  if (!raw) {
    return NextResponse.json({ error: "events array required" }, { status: 400 });
  }

  const kinds = new Set<string>(ENGAGEMENT_KINDS);
  const events: EngagementEventInput[] = [];

  for (const item of raw.slice(0, ENGAGEMENT_BATCH_LIMIT)) {
    if (typeof item !== "object" || item === null) continue;
    const e = item as Record<string, unknown>;
    const reportId = typeof e.reportId === "string" ? e.reportId : null;
    const kind = typeof e.kind === "string" && kinds.has(e.kind) ? (e.kind as EngagementKind) : null;
    if (!reportId || !kind) continue;

    const value = typeof e.value === "number" && Number.isFinite(e.value) ? e.value : null;
    const surface = typeof e.surface === "string" ? e.surface.slice(0, 40) : null;
    events.push({ reportId, kind, value, surface });
  }

  if (events.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  const result = await recordEngagementEvents(events);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
