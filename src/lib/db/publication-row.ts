import { createPublicClient } from "@/lib/supabase/public";
import type { Direction, Report } from "@/lib/types";

/**
 * A publication's ticker and direction are its own: `reports.ticker` and
 * `reports.stance`. Grading is gone, and nothing else is read from the
 * retired calls table.
 *
 * The one exception is this bridge. Until migration 0065 is applied,
 * `reports` has no stance column and the archived call is the only place a
 * direction lives, so the join carries `direction` and nothing else, and
 * `publicationRow` moves it onto the report as `stance`. The migration
 * copies every call's direction onto its publication, so the two sources
 * agree row for row. The bridge goes when the calls table is dropped.
 */
export const CALL_JOIN = "prediction:predictions(direction)";

export const REPORT_SELECT = `*, author:profiles!reports_author_id_fkey(*), ${CALL_JOIN}`;

/** A joined report row, flattened: the stance on the report, the bridge dropped. */
export function publicationRow(row: Record<string, unknown>): Report {
  const { prediction, ...rest } = row;
  const raw = (Array.isArray(prediction) ? (prediction[0] ?? null) : (prediction ?? null)) as
    | { direction?: Direction | null }
    | null;
  const ticker = (rest.ticker as string | null | undefined) ?? null;
  const stance = "stance" in rest ? ((rest.stance as Direction | null) ?? null) : (raw?.direction ?? null);
  return { ...(rest as unknown as Report), ticker, stance: ticker ? stance : null };
}

/** The chip pair every surface shows: the ticker, and the direction only beside a ticker. */
export function stanceChips(report: Pick<Report, "ticker" | "stance">): {
  ticker: string | null;
  direction: Direction | null;
} {
  const ticker = report.ticker?.trim() ? report.ticker.trim().toUpperCase() : null;
  return { ticker, direction: ticker ? (report.stance ?? null) : null };
}

let stanceColumn: { known: boolean; at: number } | null = null;

/**
 * Whether `reports.stance` exists yet (migration 0065). Explicit column lists
 * cannot name a column that is missing, so they ask first. Once seen it is
 * remembered; a miss is asked again after a minute.
 */
export async function reportsHaveStance(): Promise<boolean> {
  if (stanceColumn && (stanceColumn.known || Date.now() - stanceColumn.at < 60_000)) {
    return stanceColumn.known;
  }
  const { error } = await createPublicClient().from("reports").select("stance").limit(1);
  const known = !error;
  stanceColumn = { known, at: Date.now() };
  return known;
}
