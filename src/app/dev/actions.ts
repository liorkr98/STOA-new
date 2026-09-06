"use server";

import { revalidatePath } from "next/cache";

/**
 * Dev-only. Does what a successful draft save does to the page without
 * needing a session: revalidates a path, which makes the router refresh the
 * current route. The compose fixture presses this to prove that a refresh
 * mid-sequence keeps the creator where they were.
 */
export async function devRefreshRoute(): Promise<{ ok: true }> {
  if (process.env.NODE_ENV === "production") return { ok: true };
  revalidatePath("/feed");
  return { ok: true };
}
