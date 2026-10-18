/**
 * The signed-out wall (FEATURE_GATED_SITE) with the flag on: what is public,
 * what the prompt names, what the middleware does with no session and with a
 * forged one, and what the sitemap lists. `npm run test:gated`; the off state
 * is `npm run test:gated-off`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

assert.equal(process.env.FEATURE_GATED_SITE, "on", "run with the flag on");
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "placeholder-anon-key";
process.env.NEXT_PUBLIC_SITE_URL ??= "https://www.stoamarket.ai";

const { parseGatedSiteFlag, gatedSiteOn } = await import("@/lib/flags/gated-site");
const { isOpenPath, isPublicPage, gatedTarget, gatedHeadline, PUBLIC_PAGES } = await import("@/lib/gate/routes");
const { NextRequest } = await import("next/server");
const { middleware } = await import("@/middleware");
const { default: sitemap } = await import("@/app/sitemap");

const GATED = [
  "/home", "/feed", "/explore", "/markets", "/markets/NVDA", "/markets/sector/semiconductors", "/markets/theme/ai",
  "/search?q=nv", "/report/b5e8342b-d337-4711-a5ef-472b990c4940", "/analyst/james_okonkwo", "/saved", "/notebook",
  "/dispatch", "/dashboard", "/watchlist", "/portfolio", "/screener", "/following", "/subscriptions", "/inbox",
  "/wallet", "/profile", "/settings", "/studio", "/studio/compose", "/become-analyst", "/onboarding/investor",
  "/demo/clips/clip-01.mp4", "/dev/feed",
];

test("the flag has two states and anything unrecognised is off", () => {
  assert.equal(parseGatedSiteFlag("on"), "on");
  assert.equal(parseGatedSiteFlag(" ON "), "on");
  for (const v of [undefined, "", "off", "true", "1", "allowlist:x@y.z"]) assert.equal(parseGatedSiteFlag(v), "off");
  assert.equal(gatedSiteOn(), true);
});

test("public: the landing page, sign-in and sign-up, pricing, about, contact and every legal page", () => {
  for (const p of ["/", "/sign-in", "/sign-up", "/pricing", "/about", "/contact", "/terms", "/terms/creators", "/privacy", "/cookies", "/accessibility", "/not-advice", "/subprocessors", "/compliance-brief"]) {
    assert.ok(isPublicPage(p), p);
    assert.ok(isOpenPath(p), p);
  }
  assert.ok(isOpenPath("/auth/callback"));
  assert.ok(isOpenPath("/signed-out"));
  assert.ok(isOpenPath("/sitemap.xml"));
});

test("everything else is gated, analyst profiles included", () => {
  for (const p of GATED) assert.equal(isOpenPath(p), false, p);
  for (const p of GATED) assert.equal((PUBLIC_PAGES as readonly string[]).includes(p.split("?")[0]), false, p);
});

test("the prompt names what is behind it", () => {
  assert.equal(gatedHeadline(gatedTarget("/report/b5e8342b-d337-4711-a5ef-472b990c4940")), "Sign in to read this publication");
  assert.equal(gatedHeadline(gatedTarget("/analyst/james_okonkwo"), "James Okonkwo"), "Sign in to see James Okonkwo's publications");
  assert.equal(gatedHeadline(gatedTarget("/markets/nvda")), "Sign in to see the research on NVDA");
  assert.equal(gatedHeadline(gatedTarget("/feed")), "Sign in to open the Feed");
  assert.equal(gatedHeadline(gatedTarget("/home")), "Sign in to open Today");
  assert.equal(gatedHeadline(gatedTarget("/saved")), "Sign in to open your Library");
  assert.equal(gatedHeadline(gatedTarget("/markets/sector/semiconductors")), "Sign in to open the semiconductors sector");
});

function rewriteOf(res: Response): string | null {
  const to = res.headers.get("x-middleware-rewrite");
  return to ? new URL(to).pathname + new URL(to).search : null;
}

test("a signed-out request to a gated page is answered by the prompt, at the same address, noindex", async () => {
  for (const p of GATED) {
    const res = await middleware(new NextRequest(`https://www.stoamarket.ai${p}`));
    assert.equal(rewriteOf(res), `/signed-out?from=${encodeURIComponent(p)}`, p);
    assert.equal(res.headers.get("x-robots-tag"), "noindex", p);
    assert.equal(res.headers.get("location"), null, `${p} is not redirected`);
  }
});

test("public pages pass straight through", async () => {
  for (const p of ["/", "/pricing", "/terms", "/sign-up?next=%2Ffeed"]) {
    const res = await middleware(new NextRequest(`https://www.stoamarket.ai${p}`));
    assert.equal(rewriteOf(res), null, p);
    assert.equal(res.headers.get("x-robots-tag"), null, p);
  }
});

test("a hand-made session cookie does not get past the wall", async () => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${b64({ alg: "ES256", typ: "JWT", kid: "forged" })}.${b64({ sub: "00000000-0000-0000-0000-000000000000", role: "authenticated", exp })}.c2ln`;
  const cookie = `base64-${b64({ access_token: jwt, refresh_token: "x", expires_at: exp, token_type: "bearer", user: { id: "00000000-0000-0000-0000-000000000000" } })}`;
  const req = new NextRequest("https://www.stoamarket.ai/feed", { headers: { cookie: `sb-placeholder-auth-token=${cookie}` } });
  const res = await middleware(req);
  assert.equal(rewriteOf(res), "/signed-out?from=%2Ffeed");
});

test("the sitemap lists only the public pages", async () => {
  const urls = (await sitemap()).map((e) => new URL(e.url).pathname);
  assert.ok(urls.length > 0);
  for (const u of urls) assert.ok(isPublicPage(u), u);
  for (const gone of ["/explore", "/markets"]) assert.ok(!urls.includes(gone), gone);
  assert.ok(urls.includes("/contact"));
});
