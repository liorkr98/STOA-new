/**
 * FEATURE_GATED_SITE: the one switch for the signed-out wall. This is the
 * only file that reads it.
 *
 *   off (or unset, or anything unrecognised)  today's open site, unchanged
 *   on                                        a visitor with no session sees the
 *                                             landing page, sign-in/up, pricing,
 *                                             about, contact and the legal pages,
 *                                             and a sign-in prompt everywhere else
 *
 * The public list and the prompt's wording live in src/lib/gate/routes.ts.
 * Do not switch this on in production before Bunny token authentication is
 * on (docs/CHANGELOG.md, 2026-10-18): until then the wall hides links but a
 * clip's address can still be fetched directly, so it saves almost no
 * bandwidth.
 */
export type GatedSiteFlag = "off" | "on";

export function parseGatedSiteFlag(raw: string | undefined | null): GatedSiteFlag {
  return (raw ?? "").trim().toLowerCase() === "on" ? "on" : "off";
}

export function gatedSiteOn(): boolean {
  return parseGatedSiteFlag(process.env.FEATURE_GATED_SITE) === "on";
}
