// The signed-out wall, end to end against a running site with
// FEATURE_GATED_SITE=on:
//   node scripts/check-gated-site.mjs http://localhost:3000
// Signed out, every gated address must answer with the sign-in prompt, carry
// noindex, and contain no media URL; content endpoints must refuse; the
// landing page must play nothing; the sitemap must list only public pages.
// Optional, for a run against real data:
//   GATE_CONTENT='{"/report/<id>":["a sentence from its body"]}'  text that must not appear
//   GATE_COOKIE='sb-...-auth-token=...'                           a real session: gated pages open
//   GATE_LIVE_DATA=1                                               the landing page must show teasers and a poster
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const REPORT = process.env.GATE_REPORT_ID ?? "b5e8342b-d337-4711-a5ef-472b990c4940";
const ANALYST = process.env.GATE_ANALYST ?? "james_okonkwo";
const GATED = [
  "/home", "/feed", "/explore", "/markets", "/markets/NVDA", "/markets/sector/semiconductors", "/search?q=nv",
  `/report/${REPORT}`, `/analyst/${ANALYST}`, "/saved", "/notebook", "/dispatch", "/dashboard", "/watchlist",
  "/portfolio", "/screener", "/following", "/subscriptions", "/inbox", "/wallet", "/profile", "/settings",
  "/studio", "/become-analyst",
];
const PUBLIC = ["/", "/sign-in", "/sign-up", "/pricing", "/about", "/contact", "/terms", "/terms/creators", "/privacy", "/cookies", "/accessibility", "/not-advice", "/subprocessors", "/compliance-brief"];
const ENDPOINTS = [
  "/api/search?q=nv", "/api/dispatch", "/api/stats/platform", "/api/today/tickers?symbols=NVDA",
  `/api/videos/reports/${REPORT}/status`, `/api/reports/${REPORT}/audio`,
  "/api/captions?src=https%3A%2F%2Fvz-eed7c640-e1a.b-cdn.net%2F9eaf6081-2eba-4cdc-b9d7-c1ecae2f351f%2Fcaptions%2Fen.vtt",
  "/m/report-images/0d6fdfc7-c679-424b-9730-5a02aef82781/QtKeAu5O5eC9.png",
];
/** A link that plays or shows paid media: video, audio, captions, Bunny's player, report images. */
const MEDIA = /\.(m3u8|mp4|webm|mov|vtt|mp3|m4a)(\?|["'\\&\s]|$)|iframe\.mediadelivery\.net|b-cdn\.net\/[0-9a-f-]{36}\/(playlist|play_|captions|original)|\/m\/(report-images|chart-snapshots|demo-clips)\/|object\/(public|sign)\/(report-images|chart-snapshots)\/|object\/(public|sign)\/demo-clips\/[^"'\\]+\.mp4|videodelivery\.net/i;

const content = JSON.parse(process.env.GATE_CONTENT ?? "{}");
let failures = 0;
const check = (ok, line) => { if (!ok) failures++; console.log(`${ok ? "PASS" : "FAIL"}  ${line}`); };
const get = (path, headers = {}) => fetch(BASE + path, { redirect: "manual", headers });

for (const path of GATED) {
  const res = await get(path);
  const body = await res.text();
  const media = body.match(MEDIA)?.[0];
  check(res.status === 200 && body.includes("data-gate="), `${path}: answered by the sign-in prompt (${res.status})`);
  check(/noindex/.test(res.headers.get("x-robots-tag") ?? ""), `${path}: noindex header`);
  check(!media, `${path}: no media URL${media ? ` (found ${media})` : ""}`);
  for (const text of content[path] ?? []) check(!body.includes(text), `${path}: gated content absent ("${text.slice(0, 40)}")`);
}
{
  // The demo stand-in clips are static files: signed out they must not be served.
  const res = await get("/demo/clips/clip-01.mp4");
  check(!/^video\//.test(res.headers.get("content-type") ?? ""), `/demo/clips/clip-01.mp4: no video served (${res.status} ${res.headers.get("content-type")})`);
  // /dev fixtures: production sends a visitor without the dev cookie to the landing page first.
  const dev = await get("/dev/feed");
  const devBody = await dev.text();
  check((dev.status === 307 && dev.headers.get("location")?.endsWith("/")) || devBody.includes("data-gate="), `/dev/feed: not shown signed out (${dev.status})`);
}
for (const path of ENDPOINTS) {
  const res = await get(path);
  check(res.status === 401, `${path}: refused signed out (${res.status})`);
}
for (const path of PUBLIC) {
  const res = await get(path);
  check(res.status === 200, `${path}: public (${res.status})`);
  check(!/noindex/.test(res.headers.get("x-robots-tag") ?? ""), `${path}: indexable`);
}
{
  const res = await get("/");
  const body = await res.text();
  const media = body.match(MEDIA)?.[0];
  check(!media, `landing: no playable media${media ? ` (found ${media})` : ""}`);
  check(!/<video|<iframe/i.test(body), "landing: no video or player element");
  check(!/href="\/analyst\//.test(body), "landing: no links to analyst profiles");
  if (process.env.GATE_LIVE_DATA) {
    check(/today-kicker/.test(body) && /dispatch-lead-headline/.test(body), "landing: Today teasers (title, analyst, ticker)");
    check(/<img[^>]+(thumbnail|clip-|\.jpg)/i.test(body), "landing: a poster image");
  }
}
{
  const res = await get("/sitemap.xml");
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  check(res.status === 200 && locs.length > 0, `sitemap: ${locs.length} entries`);
  const stray = locs.filter((p) => !PUBLIC.includes(p));
  check(stray.length === 0, `sitemap: public pages only${stray.length ? ` (found ${stray.slice(0, 3).join(", ")})` : ""}`);
}
if (process.env.GATE_COOKIE) {
  for (const path of ["/home", "/feed", `/report/${REPORT}`, `/analyst/${ANALYST}`, "/markets/NVDA"]) {
    const res = await get(path, { cookie: process.env.GATE_COOKIE });
    const body = await res.text();
    check(res.status === 200 && !body.includes("data-gate="), `${path}: opens for a signed-in session (${res.status})`);
  }
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
