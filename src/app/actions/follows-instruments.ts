"use server";

import { revalidatePath } from "next/cache";
import {
  followInstrument,
  importInstrumentFollows,
  unfollowInstrument,
  type FollowKind,
  type InstrumentFollow,
} from "@/lib/db/follows-instruments";

/**
 * Instrument follows (backend brief item 5). These back Today's Your Tickers and
 * the Markets follow controls; the client keeps its localStorage list as a
 * signed-out fallback and imports it once on sign-in.
 */

export async function toggleInstrumentFollow(
  kind: FollowKind,
  symbol: string,
  following: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const result = following
    ? await unfollowInstrument(kind, symbol)
    : await followInstrument(kind, symbol);
  if (!result.ok) return result;

  revalidatePath("/home");
  revalidatePath("/markets");
  revalidatePath("/watchlist");
  return { ok: true };
}

/** One-time merge of a browser-local watchlist into the server-side list. */
export async function importLocalFollows(
  items: InstrumentFollow[],
): Promise<{ ok: boolean; imported: number; error?: string }> {
  const result = await importInstrumentFollows(items);
  if (result.ok && result.imported > 0) {
    revalidatePath("/home");
    revalidatePath("/watchlist");
  }
  return result;
}
