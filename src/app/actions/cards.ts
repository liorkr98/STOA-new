"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { replaceCards } from "@/lib/db/publication-cards";

/**
 * Save a draft publication's evidence-card stack (backend brief item 2).
 * Author-only and pre-publish: RLS on `publication_cards` rejects a write from
 * anyone else, and the same policy stops edits once the report is locked.
 */
export async function saveCards(
  reportId: string,
  cards: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to continue" };

  const result = await replaceCards(reportId, cards);
  if (!result.ok) return result;

  revalidatePath(`/report/${reportId}`);
  revalidatePath("/discover");
  return { ok: true };
}

/**
 * The Steelman placement gates. The objection and answer text is saved as a
 * `steelman` card via `saveCards`, not here: `reports` is public-read, so gated
 * prose stored on it would be readable with the anon key. Only the booleans that
 * decide where it appears live on the report.
 */
export async function saveSteelmanPlacement(
  reportId: string,
  input: { boxLocked?: boolean; cardLocked?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to continue" };

  const { error } = await supabase
    .from("reports")
    .update({
      steelman_box_locked: input.boxLocked === true,
      steelman_card_locked: input.cardLocked === true,
    })
    .eq("id", reportId)
    .eq("author_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/report/${reportId}`);
  return { ok: true };
}
