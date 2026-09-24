import { createPublicClient } from "@/lib/supabase/public";
import type { Direction, PublicationCall, Report } from "@/lib/types";

/**
 * A publication's ticker and direction are its own: `reports.ticker` and
 * `reports.stance`. The call is joined only for what grading still shows (the
 * seal, the entry, the target, the return), never for the ticker or the
 * direction.
 *
 * `direction` rides along on the join for one reason: until migration 0065
 * is applied, `reports` has no stance column and the call is the only place
 * the direction lives. `publicationRow` moves it onto the report as `stance`
 * and drops it from the call, so nothing downstream can read it from there.
 * The migration copies every call's direction onto its publication, so the
 * two sources agree row for row.
 */
export const CALL_FIELDS =
  "id, outcome, lock_price, target_price, resolved_price, return_pct, benchmark_pct, horizon_days, target_horizon_date, resolution_trading_date, resolves_at, created_at, direction";

export const CALL_JOIN = `prediction:predictions(${CALL_FIELDS})`;

export const REPORT_SELECT = `*, author:profiles!reports_author_id_fkey(*), ${CALL_JOIN}`;

/** A joined report row, flattened: the call's array unwrapped, the stance on the report. */
export function publicationRow(row: Record<string, unknown>): Report {
  const raw = (Array.isArray(row.prediction) ? (row.prediction[0] ?? null) : (row.prediction ?? null)) as
    | (PublicationCall & { direction?: Direction })
    | null;
  let call: PublicationCall | null = null;
  let callDirection: Direction | null = null;
  if (raw) {
    const { direction, ...rest } = raw;
    call = rest;
    callDirection = direction ?? null;
  }
  const ticker = (row.ticker as string | null | undefined) ?? null;
  const stance = "stance" in row ? ((row.stance as Direction | null) ?? null) : callDirection;
  return { ...(row as unknown as Report), ticker, stance: ticker ? stance : null, prediction: call };
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
