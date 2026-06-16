import "./load-env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  callReturn,
  computeScore,
  computeTier,
  gradeOutcome,
} from "../src/lib/engine/score";

/**
 * Seeds the marketplace with demo analysts, an investor, and a body of research
 * with resolved + open calls so scores and the leaderboard are populated.
 * Idempotent-ish: re-running creates fresh users only if the emails are free.
 *
 * Run: npm run seed
 */

const PASSWORD = "stoademo123";

const ANALYSTS = [
  { handle: "maren_vos", name: "Maren Vos", img: 47, headline: "Semis and AI infrastructure. Concentrated, high-conviction calls.", sub: 29, report: 9, skill: 0.66 },
  { handle: "dhruv_anand", name: "Dhruv Anand", img: 12, headline: "Deep value in industrials and energy. Patient, contrarian.", sub: 19, report: 7, skill: 0.6 },
  { handle: "lena_kowal", name: "Lena Kowalczyk", img: 32, headline: "Consumer and software. Earnings-driven, short horizons.", sub: 15, report: 5, skill: 0.57 },
  { handle: "theo_marchetti", name: "Theo Marchetti", img: 59, headline: "Macro-aware single names. Risk first, conviction second.", sub: 24, report: 8, skill: 0.55 },
  { handle: "priya_raman", name: "Priya Raman", img: 5, headline: "Healthcare and biotech catalysts. Event-driven.", sub: 35, report: 12, skill: 0.52 },
  { handle: "noah_feldman", name: "Noah Feldman", img: 68, headline: "Fintech and payments. Following the unit economics.", sub: 12, report: 4, skill: 0.49 },
];

const TICKERS = ["NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "META", "AMD", "JPM", "XOM", "PLTR", "COIN"];
const DIRECTIONS = ["long", "short", "hold"] as const;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}
function daysAhead(n: number) {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

async function ensureUser(db: SupabaseClient, email: string, meta: Record<string, string>) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      const { data: list } = await db.auth.admin.listUsers();
      const found = list.users.find((u) => u.email === email);
      if (found) return found.id;
    }
    throw error;
  }
  return data.user!.id;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  const db = createClient(url, key, { auth: { persistSession: false } });

  // Investor account
  const investorId = await ensureUser(db, "investor@stoa.demo", { display_name: "Demo Investor", handle: "demo_investor" });
  await db.from("wallets").update({ balance: 500 }).eq("owner_id", investorId);
  console.log("Investor: investor@stoa.demo /", PASSWORD);

  for (const a of ANALYSTS) {
    const id = await ensureUser(db, `${a.handle}@stoa.demo`, { display_name: a.name, handle: a.handle });
    await db
      .from("profiles")
      .update({
        role: "analyst",
        verified: a.skill > 0.55,
        headline: a.headline,
        sub_price: a.sub,
        report_price: a.report,
        avatar_url: `https://i.pravatar.cc/200?img=${a.img}`,
      })
      .eq("id", id);

    // Clear prior demo content for a clean reseed.
    await db.from("reports").delete().eq("author_id", id);

    const totalCalls = Math.floor(rand(16, 30));
    const allPreds: { direction: (typeof DIRECTIONS)[number]; lock_price: number; resolved_price: number | null; target_price: number | null; outcome: string; benchmark_pct: number | null }[] = [];

    for (let i = 0; i < totalCalls; i++) {
      const ticker = pick(TICKERS);
      const direction = Math.random() < 0.7 ? "long" : pick(DIRECTIONS);
      const lock = rand(40, 480);
      const horizon = pick([14, 30, 45, 60]);
      const ageDays = Math.floor(rand(5, 240));
      const isResolved = ageDays > horizon;
      const type = Math.random() < 0.45 ? "research" : "call";

      // Skill-biased move: winners more likely for higher-skill analysts.
      const win = Math.random() < a.skill;
      const magnitude = rand(0.01, 0.18);
      const movePct = direction === "short" ? (win ? -magnitude : magnitude) : win ? magnitude : -magnitude;
      const resolvedPrice = isResolved ? Math.round(lock * (1 + movePct) * 100) / 100 : null;
      const target =
        direction === "hold" ? null : Math.round(lock * (direction === "short" ? 0.9 : 1.12) * 100) / 100;

      const body =
        type === "research"
          ? `This is demo research for ${ticker}. The thesis: positioning is offside and the next catalyst resets expectations. Entry was locked at publication; the call is graded by the market.\n\nRisk: a broad market drawdown overwhelms the single-name thesis. Sizing accordingly.`
          : `Quick ${direction} on ${ticker} with a ${horizon}-day horizon.`;

      const { data: report } = await db
        .from("reports")
        .insert({
          author_id: id,
          type,
          title:
            type === "research"
              ? `${ticker}: ${direction === "short" ? "Downside is underpriced" : "The setup into the next print"}`
              : `${direction.toUpperCase()} ${ticker}`,
          summary:
            type === "research"
              ? `Why ${ticker} is mispriced over the next ${horizon} days, and where the risk lives.`
              : `A ${horizon}-day ${direction} on ${ticker}.`,
          status: "published",
          access: Math.random() < 0.25 ? "paid" : "free",
          price: a.report,
          ticker,
          published_at: daysAgo(ageDays),
          created_at: daysAgo(ageDays),
          likes: Math.floor(rand(2, 320)),
          views: Math.floor(rand(40, 5000)),
        })
        .select("id")
        .single();

      if (!report) continue;
      await db.from("report_bodies").insert({ report_id: (report as { id: string }).id, body });

      const outcome = isResolved
        ? gradeOutcome({ direction, lock_price: lock, target_price: target, resolved_price: resolvedPrice! })
        : "open";
      const benchmark = isResolved ? Math.round(rand(-4, 8) * 100) / 100 : null;
      const ret = isResolved ? callReturn(direction, lock, resolvedPrice) : null;

      await db.from("predictions").insert({
        report_id: (report as { id: string }).id,
        author_id: id,
        ticker,
        direction,
        lock_price: lock,
        target_price: target,
        horizon_days: horizon,
        resolves_at: isResolved ? daysAgo(ageDays - horizon) : daysAhead(horizon - (ageDays % horizon)),
        resolved_price: resolvedPrice,
        bench_lock_price: Math.round(rand(380, 520) * 100) / 100,
        benchmark_pct: benchmark,
        return_pct: ret != null ? Math.round(ret * 100) / 100 : null,
        outcome,
        created_at: daysAgo(ageDays),
      });

      allPreds.push({ direction, lock_price: lock, resolved_price: resolvedPrice, target_price: target, outcome, benchmark_pct: benchmark });
    }

    // A couple of short posts (no card).
    await db.from("reports").insert({
      author_id: id,
      type: "short_post",
      summary: `Market take: ${pick(TICKERS)} looks stretched here. Watching the tape, not chasing.`,
      status: "published",
      access: "free",
      published_at: daysAgo(Math.floor(rand(1, 10))),
      created_at: daysAgo(Math.floor(rand(1, 10))),
      likes: Math.floor(rand(1, 90)),
      views: Math.floor(rand(20, 800)),
    });

    const result = computeScore(
      allPreds.map((p) => ({
        direction: p.direction,
        lock_price: p.lock_price,
        resolved_price: p.resolved_price,
        benchmark_pct: p.benchmark_pct,
        outcome: p.outcome as never,
      })),
    );
    const tier = computeTier(result.score, result.total);
    await db
      .from("profiles")
      .update({ score: result.score, tier: tier.key, followers_count: Math.floor(rand(200, 14000)) })
      .eq("id", id);

    console.log(`Seeded @${a.handle}: score ${result.score} (${tier.label}), ${result.total} resolved calls.`);
  }

  console.log("\nDone. Sign in with any analyst, e.g. maren_vos@stoa.demo /", PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
