/**
 * Concurrent user simulation for Stoa (no Playwright / no new packages).
 *
 * Fires 3 simultaneous requests (1 analyst + 2 investors) at the same stock
 * page and quote API, then inspects SSR HTML for brand-register signals.
 *
 * Note: the live route is `/markets/[ticker]` (not `/stocks/...`).
 *
 * Prerequisites: `npm run dev` (or `npm start`) on BASE_URL.
 *
 * Run: npm run test:users
 *
 * Env:
 *   BASE_URL   default http://localhost:3000
 *   TICKER     default NVDA  (e.g. TEVA.TA)
 */

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const TICKER = (process.env.TICKER ?? "NVDA").toUpperCase();
const PAGE_PATH = `/markets/${encodeURIComponent(TICKER)}`;
const QUOTE_PATH = `/api/market/quote?ticker=${encodeURIComponent(TICKER)}`;
/** Fixture page that always mounts DisclosureBlock + ledger-card in SSR. */
const BRAND_FIXTURE_PATH = "/dev/components";

type Role = "analyst" | "investor-a" | "investor-b";

interface FetchResult {
  role: Role;
  label: string;
  url: string;
  status: number;
  ms: number;
  ok: boolean;
  html?: string;
  cacheHeader?: string | null;
  error?: string;
}

interface Check {
  name: string;
  pass: boolean;
  soft?: boolean;
  detail: string;
}

const USERS: { role: Role; label: string }[] = [
  { role: "analyst", label: "Analyst" },
  { role: "investor-a", label: "Investor A" },
  { role: "investor-b", label: "Investor B" },
];

const FORBIDDEN_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "glassmorphism class", re: /\bglassmorphism\b/i },
  { name: "neon glow utility", re: /\bneon[-_]?(?:glow|green|purple)\b/i },
  { name: "green gradient utility", re: /\b(?:from|to|via)-green-\d{2,3}\b/ },
  { name: "candlestick chart component", re: /\bcandlestick[-_]?(?:chart|view|widget)\b/i },
  { name: "OnlyFans brand reference", re: /\bonlyfans\b/i },
];

const DISCLOSURE_MARKERS = [
  /attested/i,
  /latency/i,
  /certified independent/i,
  /holds a position/i,
  /these are the creator/i,
  /price locked via delayed exchange feed/i,
];

async function fetchOnce(
  role: Role,
  label: string,
  path: string,
  wantBody: boolean,
): Promise<FetchResult> {
  const url = `${BASE_URL}${path}`;
  const started = performance.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: wantBody ? "text/html,application/json" : "application/json",
        "X-Stoa-Sim-Role": role,
        "X-Stoa-Sim-User": label,
        "User-Agent": `StoaSimulateUsers/1.0 (${label})`,
      },
      redirect: "follow",
      cache: "no-store",
    });
    const ms = Math.round(performance.now() - started);
    const cacheHeader =
      res.headers.get("x-nextjs-cache") ??
      res.headers.get("x-vercel-cache") ??
      res.headers.get("cf-cache-status") ??
      res.headers.get("age");
    const html = wantBody ? await res.text() : undefined;
    return {
      role,
      label,
      url,
      status: res.status,
      ms,
      ok: res.status >= 200 && res.status < 300,
      html,
      cacheHeader,
    };
  } catch (err) {
    const ms = Math.round(performance.now() - started);
    return {
      role,
      label,
      url,
      status: 0,
      ms,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function summarizeTimes(results: FetchResult[]): string {
  const times = results.map((r) => r.ms);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const spread = max - min;
  return `min ${min}ms · avg ${avg}ms · max ${max}ms · spread ${spread}ms`;
}

function hasClassToken(html: string, token: string): boolean {
  const re = new RegExp(`\\bclass="[^"]*\\b${token}\\b[^"]*"`, "i");
  return re.test(html);
}

function inspectBrand(html: string, sourceLabel: string): Check[] {
  const checks: Check[] = [];

  const hasNumClass = hasClassToken(html, "num");
  const hasFontMono =
    /\bfont-mono\b/.test(html) ||
    /--font-mono/.test(html) ||
    /font-family:\s*var\(--font-mono\)/.test(html) ||
    /IBM Plex Mono/i.test(html);
  checks.push({
    name: `Typography: mono numerals (.num / font-mono) [${sourceLabel}]`,
    pass: hasNumClass || hasFontMono,
    detail: hasNumClass
      ? "Found .num (IBM Plex Mono via design system)"
      : hasFontMono
        ? "Found font-mono / --font-mono reference"
        : "Neither .num nor font-mono found near pricing markup",
  });

  const hasLedger = hasClassToken(html, "ledger-card") || /\bledger-card\b/.test(html);
  checks.push({
    name: `Trust block: .ledger-card (double hairline) [${sourceLabel}]`,
    pass: hasLedger,
    soft: sourceLabel.startsWith("markets"),
    detail: hasLedger
      ? "Found ledger-card class"
      : sourceLabel.startsWith("markets")
        ? "Not in markets SSR unless a call/prediction card is present (soft)"
        : "No ledger-card in HTML",
  });

  const disclosureHits = DISCLOSURE_MARKERS.filter((re) => re.test(html)).map((re) =>
    re.source.replace(/\\/g, ""),
  );
  checks.push({
    name: `Feature #5: disclosure / attestation markers [${sourceLabel}]`,
    pass: disclosureHits.length > 0,
    soft: sourceLabel.startsWith("markets"),
    detail:
      disclosureHits.length > 0
        ? `Matched: ${disclosureHits.join(", ")}`
        : sourceLabel.startsWith("markets")
          ? "Attestation/disclosure copy is usually on report or /dev/components, not bare markets SSR (soft)"
          : "No Attested/latency/disclosure copy found",
  });

  for (const bad of FORBIDDEN_PATTERNS) {
    const hit = bad.re.test(html);
    checks.push({
      name: `Anti-reference: no ${bad.name} [${sourceLabel}]`,
      pass: !hit,
      detail: hit ? `Forbidden pattern matched: ${bad.re}` : "Clean",
    });
  }

  return checks;
}

function printSection(title: string) {
  console.log(`\n=== ${title} ===`);
}

function printCheck(c: Check) {
  const tag = c.pass ? "PASS" : c.soft ? "WARN" : "FAIL";
  console.log(`  ${tag}  ${c.name}`);
  console.log(`         ${c.detail}`);
}

async function main() {
  console.log("Stoa concurrent user simulation");
  console.log(`Base:   ${BASE_URL}`);
  console.log(`Ticker: ${TICKER}`);
  console.log(`Page:   ${PAGE_PATH}`);
  console.log(`Quote:  ${QUOTE_PATH}`);
  console.log(`Users:  ${USERS.map((u) => u.label).join(", ")}`);

  printSection("1. Concurrent page + quote (3 users each)");

  const pageJobs = USERS.map((u) => fetchOnce(u.role, u.label, PAGE_PATH, true));
  const quoteJobs = USERS.map((u) =>
    fetchOnce(u.role, `${u.label} (quote)`, QUOTE_PATH, false),
  );

  const started = performance.now();
  const [pageResults, quoteResults] = await Promise.all([
    Promise.all(pageJobs),
    Promise.all(quoteJobs),
  ]);
  const wallMs = Math.round(performance.now() - started);

  console.log(`Wall clock for all 6 requests: ${wallMs}ms`);
  console.log("\nPage responses:");
  for (const r of pageResults) {
    const cache = r.cacheHeader ? ` cache=${r.cacheHeader}` : "";
    const err = r.error ? ` error=${r.error}` : "";
    console.log(
      `  [${r.label.padEnd(10)}] ${r.status} in ${String(r.ms).padStart(5)}ms${cache}${err}`,
    );
  }
  console.log(`  Timing: ${summarizeTimes(pageResults)}`);

  console.log("\nQuote API responses:");
  for (const r of quoteResults) {
    const cache = r.cacheHeader ? ` cache=${r.cacheHeader}` : "";
    const err = r.error ? ` error=${r.error}` : "";
    console.log(
      `  [${r.label.padEnd(18)}] ${r.status} in ${String(r.ms).padStart(5)}ms${cache}${err}`,
    );
  }
  console.log(`  Timing: ${summarizeTimes(quoteResults)}`);

  const backendChecks: Check[] = [];
  const pageOk = pageResults.every((r) => r.ok);
  const quoteOk = quoteResults.every((r) => r.ok);
  backendChecks.push({
    name: "All page requests return 2xx (no 500 crash)",
    pass: pageOk,
    detail: pageOk
      ? "All 3 page requests succeeded"
      : `Statuses: ${pageResults.map((r) => r.status).join(", ")}`,
  });
  backendChecks.push({
    name: "All quote API requests return 2xx",
    pass: quoteOk,
    detail: quoteOk
      ? "All 3 quote requests succeeded"
      : `Statuses: ${quoteResults.map((r) => r.status).join(", ")}`,
  });

  const pageTimes = pageResults.map((r) => r.ms);
  const pageMax = Math.max(...pageTimes);
  const pageMin = Math.min(...pageTimes);
  const smooth =
    pageResults.every((r) => r.ok) &&
    pageMax < 15_000 &&
    pageMax <= Math.max(pageMin * 4, pageMin + 8_000);
  backendChecks.push({
    name: "Concurrent load stays smooth (no runaway latency)",
    pass: smooth,
    detail: `${summarizeTimes(pageResults)} (pass if max < 15s and within ~4x of min)`,
  });

  printSection("2. Immediate second wave (cache / reuse signal)");
  const wave2 = await Promise.all(
    USERS.map((u) => fetchOnce(u.role, u.label, PAGE_PATH, false)),
  );
  for (const r of wave2) {
    console.log(`  [${r.label.padEnd(10)}] ${r.status} in ${String(r.ms).padStart(5)}ms`);
  }
  const wave1Avg =
    pageResults.reduce((a, b) => a + b.ms, 0) / Math.max(pageResults.length, 1);
  const wave2Avg = wave2.reduce((a, b) => a + b.ms, 0) / Math.max(wave2.length, 1);
  const cacheFriendly = wave2.every((r) => r.ok) && wave2Avg <= wave1Avg * 1.25;
  backendChecks.push({
    name: "Second wave not slower than first (cache-friendly)",
    pass: cacheFriendly,
    detail: `wave1 avg ${Math.round(wave1Avg)}ms → wave2 avg ${Math.round(wave2Avg)}ms`,
  });

  printSection("3. Frontend brand register (SSR HTML)");
  const sampleHtml = pageResults.find((r) => r.html && r.html.length > 0)?.html ?? "";
  const brandChecks: Check[] = sampleHtml
    ? inspectBrand(sampleHtml, `markets/${TICKER}`)
    : [
        {
          name: "SSR HTML available",
          pass: false,
          detail: "No HTML body to inspect (is the dev server running?)",
        },
      ];

  for (const c of brandChecks) printCheck(c);

  // Hard brand probe: disclosure + ledger always exist on the component fixture.
  printSection("4. Brand fixture (/dev/components) for disclosure + ledger");
  const fixture = await fetchOnce("analyst", "Brand fixture", BRAND_FIXTURE_PATH, true);
  console.log(
    `  [${"fixture".padEnd(10)}] ${fixture.status} in ${String(fixture.ms).padStart(5)}ms` +
      (fixture.error ? ` error=${fixture.error}` : ""),
  );
  const fixtureChecks =
    fixture.ok && fixture.html
      ? inspectBrand(fixture.html, "dev/components").filter(
          (c) =>
            c.name.includes("ledger-card") ||
            c.name.includes("Feature #5") ||
            c.name.includes("Anti-reference"),
        )
      : [
          {
            name: "Brand fixture reachable",
            pass: false,
            soft: true,
            detail: `Could not load ${BRAND_FIXTURE_PATH} (${fixture.status})`,
          },
        ];
  for (const c of fixtureChecks) printCheck(c);

  printSection("Summary");
  const all = [...backendChecks, ...brandChecks, ...fixtureChecks];
  for (const c of backendChecks) printCheck(c);

  const hardFailed = all.filter((c) => !c.pass && !c.soft);
  const softWarned = all.filter((c) => !c.pass && c.soft);
  console.log(
    `\n${all.length - hardFailed.length - softWarned.length}/${all.length} passed` +
      (softWarned.length ? `, ${softWarned.length} soft warn` : "") +
      (hardFailed.length ? `, ${hardFailed.length} failed` : ""),
  );

  if (!pageOk && pageResults.some((r) => r.error?.includes("ECONNREFUSED"))) {
    console.error(
      `\nCould not reach ${BASE_URL}. Start the app first:\n  npm run dev\nthen re-run:\n  npm run test:users`,
    );
  }

  process.exit(hardFailed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
