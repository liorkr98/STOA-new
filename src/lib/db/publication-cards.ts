import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
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
    case "chart":
      return { kind, id, locked: true, ticker: "", caption: "" };
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
  const card = { ...(row.payload as object), kind: row.kind, id: row.id, locked: row.locked } as FeedCard;
  // Rows written before figure images were uploaded hold a blob: object URL
  // that resolves nowhere. Drop it so the card falls back to its placeholder
  // instead of handing an unfetchable src to the image loader.
  if (card.kind === "figure" && card.imageUrl && !/^https?:\/\//i.test(card.imageUrl)) {
    return { ...card, imageUrl: null };
  }
  return card;
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
 * The author's own deck, for Compose. Deliberately not `listCardsForReport`:
 * that one strips the payload off every locked row, which is right for a
 * reader and wrong for the person who wrote it -- reopening a draft would show
 * the creator empty cards where their own gated words used to be. RLS already
 * lets an author read their locked rows (`can_read_report_body` passes on
 * `author_id = uid`), so the ownership check here is belt-and-braces and the
 * payload is returned intact.
 */
export async function listAuthorCards(
  reportId: string,
  authorId: string,
): Promise<{ id: string; kind: FeedCard["kind"]; locked: boolean; payload: Record<string, unknown> }[]> {
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("reports")
    .select("author_id")
    .eq("id", reportId)
    .maybeSingle();
  if (!report || (report as { author_id: string }).author_id !== authorId) return [];

  const { data, error } = await supabase
    .from("publication_cards")
    .select(CARD_COLUMNS)
    .eq("report_id", reportId)
    .order("position", { ascending: true });
  if (error || !data) return [];

  return (data as PublicationCardRow[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    locked: row.locked,
    payload: row.payload ?? {},
  }));
}

/**
 * Which of these publications have an evidence stack, for the content badge.
 * Presence only, so it stays one indexed query and never fetches payloads.
 *
 * `sessionless` reads with the cookie-free anon client. Callers must pass it
 * when there is no signed-in reader, because those call sites run inside a
 * cached page build: `cookies()` inside a cache scope throws (that crashed
 * signed-out /home), and a shared cache entry must not depend on one visitor's
 * session anyway. With no session the two clients see the same rows under the
 * `publication_cards_read` policy, so the badge is unchanged.
 */
export async function reportIdsWithCards(
  reportIds: string[],
  { sessionless = false }: { sessionless?: boolean } = {},
): Promise<Set<string>> {
  const out = new Set<string>();
  if (reportIds.length === 0) return out;

  const supabase = sessionless ? createPublicClient() : await createClient();
  const { data } = await supabase
    .from("publication_cards")
    .select("report_id")
    .in("report_id", reportIds)
    .neq("kind", "unlock");

  for (const row of (data as { report_id: string }[] | null) ?? []) out.add(row.report_id);
  return out;
}

/** A stack reduced to what a reader would actually see a difference in. */
function cardFingerprint(
  cards: { kind: string; locked: boolean; payload: unknown }[],
): string {
  return JSON.stringify(cards.map((c) => [c.kind, c.locked, c.payload]));
}

/**
 * Replace a publication's card stack. Author-only via RLS. Payloads are
 * validated against their `kind` before insert, which is what makes the read
 * path safe to trust.
 *
 * This is no longer pre-publish only: the deck of a live publication can be
 * edited, and `changed` reports whether it actually moved so the caller can
 * disclose a real change and stay quiet about a no-op save.
 */
export async function replaceCards(
  reportId: string,
  input: unknown,
): Promise<{ ok: boolean; error?: string; changed?: boolean }> {
  let cards: ValidatedCard[];
  try {
    cards = validateCards(input);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "invalid cards" };
  }

  const supabase = await createClient();

  // Read before writing, so an edit to a live publication can say whether the
  // deck actually moved. A delete-and-reinsert of an identical stack must not
  // be disclosed as a change the reader can see, because it is not one.
  const { data: existing } = await supabase
    .from("publication_cards")
    .select("kind, locked, payload")
    .eq("report_id", reportId)
    .order("position", { ascending: true });
  const before = cardFingerprint(
    ((existing as { kind: string; locked: boolean; payload: unknown }[] | null) ?? []),
  );
  const after = cardFingerprint(cards);
  const changed = before !== after;

  const { error: delError } = await supabase
    .from("publication_cards")
    .delete()
    .eq("report_id", reportId);
  if (delError) return { ok: false, error: delError.message };

  if (cards.length === 0) return { ok: true, changed };

  const rows = cards.map((c, i) => ({
    report_id: reportId,
    position: i,
    kind: c.kind,
    locked: c.locked,
    payload: c.payload,
  }));

  const { error } = await supabase.from("publication_cards").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, changed };
}
