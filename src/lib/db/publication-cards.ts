import "server-only";

import { createClient } from "@/lib/supabase/server";
import { validateCards, type ValidatedCard } from "@/lib/feed/card-schema";
import type { FeedCard } from "@/lib/feed/types";

/**
 * Evidence cards (backend brief items 2 + 3).
 *
 * Two layers of protection, deliberately belt-and-braces:
 *   1. RLS on `publication_cards` (migration 0051) will not return a locked row
 *      to a reader without entitlement. That is the real enforcement.
 *   2. `toFeedCard` below rebuilds each card from the payload and, for a locked
 *      row, emits only the shell (kind + locked) with no payload fields. So even
 *      if a future read path bypasses RLS with a service-role client, the shape
 *      handed to the browser still carries no gated prose or numbers.
 *
 * The player renders a sealed card from the shell alone, which is why stripping
 * costs nothing visually.
 */

export interface PublicationCardRow {
  id: string;
  report_id: string;
  position: number;
  kind: FeedCard["kind"];
  locked: boolean;
  payload: Record<string, unknown>;
}

const CARD_COLUMNS = "id, report_id, position, kind, locked, payload";

/**
 * Empty-but-valid payloads. A locked card must still satisfy the discriminated
 * union so the player can render its sealed state without special-casing.
 */
function emptyCard(id: string, kind: FeedCard["kind"]): FeedCard {
  switch (kind) {
    case "thesis":
      return { kind, id, locked: true, title: "", body: "" };
    case "edge":
      return { kind, id, locked: true, street: [], mine: [] };
    case "path_to_target":
      return { kind, id, locked: true, steps: [], result: { text: "", ink: "plain" } };
    case "kill_switch":
      return { kind, id, locked: true, conditions: [] };
    case "catalyst_timeline":
      return { kind, id, locked: true, events: [] };
    case "checklist":
      return { kind, id, locked: true, rows: [] };
    case "figure":
      return { kind, id, locked: true, caption: "", imageUrl: null, source: "creator" };
    case "steelman":
      return { kind, id, locked: true, objection: "", answer: "" };
    case "unlock":
      return { kind, id, locked: false, price: null, access: "free" };
  }
}

/** Map a stored row to the player's card shape, stripping locked payloads. */
export function toFeedCard(row: PublicationCardRow): FeedCard {
  if (row.locked && row.kind !== "unlock") return emptyCard(row.id, row.kind);
  // Payload shape is validated on write; trust it here rather than re-parsing.
  return { ...(row.payload as object), kind: row.kind, id: row.id, locked: row.locked } as FeedCard;
}

/** Cards for many publications in one query, never one query per card. */
export async function listCardsForReports(
  reportIds: string[],
): Promise<Map<string, FeedCard[]>> {
  const out = new Map<string, FeedCard[]>();
  if (reportIds.length === 0) return out;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("publication_cards")
    .select(CARD_COLUMNS)
    .in("report_id", reportIds)
    .order("position", { ascending: true });

  if (error || !data) return out;

  for (const row of data as PublicationCardRow[]) {
    const list = out.get(row.report_id) ?? [];
    list.push(toFeedCard(row));
    out.set(row.report_id, list);
  }
  return out;
}

export async function listCardsForReport(reportId: string): Promise<FeedCard[]> {
  return (await listCardsForReports([reportId])).get(reportId) ?? [];
}

/**
 * Replace a draft publication's card stack. Author-only via RLS, and blocked by
 * that policy once the report is locked, so this is a pre-publish operation.
 * Payloads are validated against their `kind` before insert, which is what makes
 * the read path safe to trust.
 */
export async function replaceCards(
  reportId: string,
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  let cards: ValidatedCard[];
  try {
    cards = validateCards(input);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "invalid cards" };
  }

  const supabase = await createClient();

  const { error: delError } = await supabase
    .from("publication_cards")
    .delete()
    .eq("report_id", reportId);
  if (delError) return { ok: false, error: delError.message };

  if (cards.length === 0) return { ok: true };

  const rows = cards.map((c, i) => ({
    report_id: reportId,
    position: i,
    kind: c.kind,
    locked: c.locked,
    payload: c.payload,
  }));

  const { error } = await supabase.from("publication_cards").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
