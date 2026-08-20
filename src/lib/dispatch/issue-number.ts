import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cached } from "@/lib/market/cache";
import { fallbackIssueNumber } from "@/lib/dispatch/cycle";

/**
 * The dispatch issue number, resolved once per day per instance.
 *
 * `bump_dispatch_issue` is idempotent per day, but it is still a database write,
 * and it was being called on every Today, landing and dispatch render -- it was
 * the second most-called statement in the database. Since the answer only
 * changes at the day boundary, caching it keyed by date removes the write from
 * the render path entirely while keeping the same value.
 */

const ISSUE_TTL_MS = 60 * 60_000;

export async function getIssueNumber(dateISO: string): Promise<number> {
  return cached(`dispatch:issue:${dateISO}`, ISSUE_TTL_MS, async () => {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("bump_dispatch_issue");
      if (!error && typeof data === "number") return data;
    } catch {
      // migration may not be applied locally
    }
    return fallbackIssueNumber(dateISO);
  });
}
