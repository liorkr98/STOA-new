import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { TAG_LIMITS } from "./taxonomy";

/**
 * Server-side tag validation against `publication_tags` (migration 0049). The
 * Compose picker enforces the same rules, but the picker is a UI gate: anything
 * calling the publish action or route directly must be validated here too. The
 * database trigger is the final backstop; this exists to return a useful error
 * instead of a raw Postgres exception.
 */

export interface NormalizedTags {
  primary_tag: string | null;
  secondary_tags: string[];
  theme_tag: string | null;
}

export class TagValidationError extends Error {}

export async function normalizeTags(
  supabase: SupabaseClient,
  input: { primary_tag?: string | null; secondary_tags?: string[]; theme_tag?: string | null },
  opts: { requirePrimary?: boolean } = {},
): Promise<NormalizedTags> {
  const primary = input.primary_tag?.trim() || null;
  const rawSecondary = (input.secondary_tags ?? []).map((s) => s.trim()).filter(Boolean);
  // De-dupe and drop any repeat of the primary before counting.
  const secondary = [...new Set(rawSecondary)].filter((s) => s !== primary);
  const theme = input.theme_tag?.trim() || primary;

  if (opts.requirePrimary && !primary) {
    throw new TagValidationError("Pick a primary tag before publishing.");
  }
  if (secondary.length > TAG_LIMITS.secondary) {
    throw new TagValidationError(`At most ${TAG_LIMITS.secondary} secondary tags.`);
  }

  const wanted = [...new Set([primary, theme, ...secondary].filter(Boolean))] as string[];
  if (wanted.length === 0) {
    return { primary_tag: null, secondary_tags: [], theme_tag: null };
  }

  const { data, error } = await supabase
    .from("publication_tags")
    .select("slug")
    .in("slug", wanted);
  if (error) throw new TagValidationError(error.message);

  const known = new Set((data ?? []).map((r) => (r as { slug: string }).slug));
  const unknown = wanted.filter((s) => !known.has(s));
  if (unknown.length > 0) {
    throw new TagValidationError(`Unknown tag: ${unknown.join(", ")}`);
  }

  return { primary_tag: primary, secondary_tags: secondary, theme_tag: theme };
}
