/**
 * FEATURE_GATED_SITE off: the wall does nothing. `npm run test:gated-off`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

assert.ok(!process.env.FEATURE_GATED_SITE || process.env.FEATURE_GATED_SITE === "off", "run with the flag off");
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "placeholder-anon-key";

const { gatedSiteOn } = await import("@/lib/flags/gated-site");
const { NextRequest } = await import("next/server");
const { middleware } = await import("@/middleware");

test("off: no page is rewritten to the prompt and nothing is marked noindex", async () => {
  assert.equal(gatedSiteOn(), false);
  for (const p of ["/feed", "/report/b5e8342b-d337-4711-a5ef-472b990c4940", "/analyst/james_okonkwo", "/markets/NVDA", "/dispatch", "/"]) {
    const res = await middleware(new NextRequest(`https://www.stoamarket.ai${p}`));
    assert.equal(res.headers.get("x-middleware-rewrite"), null, p);
    assert.equal(res.headers.get("x-robots-tag"), null, p);
  }
});
