import "./load-env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  callReturn,
  computeScore,
  computeTier,
  gradeOutcome,
} from "../src/lib/engine/score";

/**
 * Seeds the marketplace with diverse demo analysts, an investor, and research
 * with resolved + open calls so scores, tiers, and the leaderboard are populated.
 *
 * All demo accounts use @stoa.demo emails — safe to re-run (purges prior demo content).
 * Does not touch real users (e.g. liorkr98@gmail.com).
 *
 * Run: pnpm seed
 */

const PASSWORD = "stoademo123";

type AnalystSeed = {
  handle: string;
  name: string;
  headline: string;
  bio: string;
  specialty: string;
  /** Dicebear seed for a distinct portrait */
  avatarSeed: string;
  coverSeed: string;
  sub: number;
  report: number;
  /** Win-rate bias when simulating resolved calls (0.35 = struggling, 0.72 = elite). */
  skill: number;
  minCalls: number;
  maxCalls: number;
  verified?: boolean;
  identityVerified?: boolean;
};

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/notionists/png?seed=${encodeURIComponent(seed)}&size=256&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

function coverUrl(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/400`;
}

const ANALYSTS: AnalystSeed[] = [
  {
    handle: "marcus_webb",
    name: "Marcus Webb",
    headline: "Multi-cap generalist. 15 years on the buy side.",
    bio: "Former PM at a long-only fund. I publish a few high-conviction calls per quarter and let the tape grade them.",
    specialty: "Generalist",
    avatarSeed: "marcus-webb",
    coverSeed: "mw-cover",
    sub: 49,
    report: 15,
    skill: 0.72,
    minCalls: 70,
    maxCalls: 85,
    verified: true,
    identityVerified: true,
  },
  {
    handle: "maren_vos",
    name: "Maren Vos",
    headline: "Semis & AI infrastructure. Concentrated, high-conviction.",
    bio: "Covering NVDA ecosystem and supply chain. I size positions around catalysts, not narratives.",
    specialty: "Semiconductors",
    avatarSeed: "maren-vos",
    coverSeed: "mv-cover",
    sub: 29,
    report: 9,
    skill: 0.68,
    minCalls: 32,
    maxCalls: 42,
    verified: true,
    identityVerified: true,
  },
  {
    handle: "fatima_alhariri",
    name: "Fatima Al-Hariri",
    headline: "Healthcare & biotech catalysts. Event-driven.",
    bio: "PhD pharmacology. I focus on PDUFA dates, trial readouts, and mispriced optionality in mid-cap biotech.",
    specialty: "Healthcare",
    avatarSeed: "fatima-alhariri",
    coverSeed: "fa-cover",
    sub: 35,
    report: 12,
    skill: 0.66,
    minCalls: 28,
    maxCalls: 38,
    verified: true,
  },
  {
    handle: "dhruv_anand",
    name: "Dhruv Anand",
    headline: "Deep value in industrials and energy. Patient, contrarian.",
    bio: "Graham-Dodd mindset with a macro overlay. I wait for forced sellers and compound through cycles.",
    specialty: "Value / Energy",
    avatarSeed: "dhruv-anand",
    coverSeed: "da-cover",
    sub: 19,
    report: 7,
    skill: 0.62,
    minCalls: 18,
    maxCalls: 26,
    verified: true,
  },
  {
    handle: "yuki_tanaka",
    name: "Yuki Tanaka",
    headline: "Asia tech supply chain & ADRs.",
    bio: "Tokyo-based. Bridge between US listings and Asia fundamentals — memory, foundry, consumer internet.",
    specialty: "Asia Tech",
    avatarSeed: "yuki-tanaka",
    coverSeed: "yt-cover",
    sub: 22,
    report: 8,
    skill: 0.61,
    minCalls: 16,
    maxCalls: 24,
    verified: true,
  },
  {
    handle: "theo_marchetti",
    name: "Theo Marchetti",
    headline: "Macro-aware single names. Risk first.",
    bio: "Rates, FX, and positioning drive my single-stock work. Every call has a clear invalidation level.",
    specialty: "Macro / Single-stock",
    avatarSeed: "theo-marchetti",
    coverSeed: "tm-cover",
    sub: 24,
    report: 8,
    skill: 0.58,
    minCalls: 14,
    maxCalls: 22,
  },
  {
    handle: "james_okonkwo",
    name: "James Okonkwo",
    headline: "Energy transition & traditional O&G.",
    bio: "Covering upstream, LNG, and grid bottlenecks. Earnings revisions are my edge.",
    specialty: "Energy",
    avatarSeed: "james-okonkwo",
    coverSeed: "jo-cover",
    sub: 18,
    report: 6,
    skill: 0.57,
    minCalls: 10,
    maxCalls: 16,
  },
  {
    handle: "lena_kowal",
    name: "Lena Kowalczyk",
    headline: "Consumer & software. Earnings-driven.",
    bio: "Short-horizon calls around prints. I model unit economics and churn, not slide decks.",
    specialty: "Consumer / SaaS",
    avatarSeed: "lena-kowal",
    coverSeed: "lk-cover",
    sub: 15,
    report: 5,
    skill: 0.55,
    minCalls: 12,
    maxCalls: 18,
  },
  {
    handle: "priya_raman",
    name: "Priya Raman",
    headline: "Fintech & payments. Unit economics obsessed.",
    bio: "Former product lead at a neobank. I stress-test take rates, CAC, and regulatory risk.",
    specialty: "Fintech",
    avatarSeed: "priya-raman",
    coverSeed: "pr-cover",
    sub: 20,
    report: 7,
    skill: 0.53,
    minCalls: 8,
    maxCalls: 14,
  },
  {
    handle: "olivia_grant",
    name: "Olivia Grant",
    headline: "Dividend growers & quality compounders.",
    bio: "Low turnover, long horizons. I look for durable ROIC and management that allocates well.",
    specialty: "Dividends",
    avatarSeed: "olivia-grant",
    coverSeed: "og-cover",
    sub: 12,
    report: 4,
    skill: 0.51,
    minCalls: 5,
    maxCalls: 9,
  },
  {
    handle: "noah_feldman",
    name: "Noah Feldman",
    headline: "Small-cap discovery. High variance by design.",
    bio: "Micro-cap specialist. Many ideas, smaller size. Track record still forming — judge the process.",
    specialty: "Small-cap",
    avatarSeed: "noah-feldman",
    coverSeed: "nf-cover",
    sub: 9,
    report: 3,
    skill: 0.48,
    minCalls: 4,
    maxCalls: 7,
  },
  {
    handle: "sara_cohen",
    name: "Sara Cohen",
    headline: "TASE tech & growth (Tel Aviv).",
    bio: "Israeli equities in English. Covering NICE, CyberArk ecosystem, and dual-listed names.",
    specialty: "Israel / TASE",
    avatarSeed: "sara-cohen",
    coverSeed: "sc-cover",
    sub: 14,
    report: 5,
    skill: 0.52,
    minCalls: 6,
    maxCalls: 11,
  },
  {
    handle: "carlos_mendez",
    name: "Carlos Mendez",
    headline: "Just getting started on Stoa.",
    bio: "Publishing my first calls in public. Former equity sales — learning to put skin in the game.",
    specialty: "Learning",
    avatarSeed: "carlos-mendez",
    coverSeed: "cm-cover",
    sub: 0,
    report: 0,
    skill: 0.46,
    minCalls: 2,
    maxCalls: 4,
  },
  {
    handle: "elena_petrova",
    name: "Elena Petrova",
    headline: "Contrarian macro shorts. Often wrong, sometimes spectacularly right.",
    bio: "I run a high-beta book of tactical shorts. Volatile track record — not for everyone.",
    specialty: "Contrarian / Short",
    avatarSeed: "elena-petrova",
    coverSeed: "ep-cover",
    sub: 11,
    report: 4,
    skill: 0.36,
    minCalls: 20,
    maxCalls: 28,
  },
];

const TICKERS_US = [
  "NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "META", "AMD", "JPM", "XOM",
  "PLTR", "COIN", "CRM", "NFLX", "UBER", "SQ", "SHOP", "SNOW", "ARM", "AVGO",
];
const TICKERS_IL = ["NICE.TA", "TEVA.TA", "CHKP.TA", "WIX.TA", "MNDY.TA"];

const DIRECTIONS = ["long", "short", "hold"] as const;
const ACCESS = ["free", "free", "free", "subscribers", "paid"] as const;

const RESEARCH_TITLES = [
  (t: string, d: string) => `${t}: ${d === "short" ? "Downside underpriced" : "Setup into the catalyst"}`,
  (t: string) => `${t} — what the street is missing`,
  (t: string) => `Re-rating path for ${t}`,
  (t: string, d: string) => `${t} ${d} thesis (demo)`,
];

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
      const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
      const found = list.users.find((u) => u.email === email);
      if (found) return found.id;
    }
    throw error;
  }
  return data.user!.id;
}

function tickersFor(analyst: AnalystSeed): string[] {
  if (analyst.specialty.includes("Israel") || analyst.specialty.includes("TASE")) {
    return [...TICKERS_IL, ...TICKERS_US.slice(0, 6)];
  }
  return TICKERS_US;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.");
  }
  if (key === "your-service-role-key" || key === "your-secret-key") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is still a placeholder. Paste your sb_secret_... key from Supabase.");
  }
  if (key.startsWith("sb_publishable_")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be the secret key (sb_secret_...), not the publishable key.");
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  const investorId = await ensureUser(db, "investor@stoa.demo", {
    display_name: "Demo Investor",
    handle: "demo_investor",
  });
  await db.from("wallets").update({ balance: 500 }).eq("owner_id", investorId);
  console.log("Investor: investor@stoa.demo /", PASSWORD);

  const analystIds: string[] = [];

  for (const a of ANALYSTS) {
    const id = await ensureUser(db, `${a.handle}@stoa.demo`, { display_name: a.name, handle: a.handle });
    analystIds.push(id);

    await db
      .from("profiles")
      .update({
        role: "analyst",
        display_name: a.name,
        verified: a.verified ?? a.skill > 0.58,
        identity_verified: a.identityVerified ?? false,
        headline: a.headline,
        bio: a.bio,
        sub_price: a.sub > 0 ? a.sub : null,
        report_price: a.report > 0 ? a.report : null,
        avatar_url: avatarUrl(a.avatarSeed),
        cover_url: coverUrl(a.coverSeed),
        profile_config: {
          accent: pick(["amber", "blue", "emerald", "rose", "violet"]),
          specialty: a.specialty,
          layout: pick(["classic", "compact"]),
        },
      })
      .eq("id", id);

    await db.rpc("purge_demo_author", { p_author_id: id });

    const totalCalls = Math.floor(rand(a.minCalls, a.maxCalls));
    const pool = tickersFor(a);
    const allPreds: {
      direction: (typeof DIRECTIONS)[number];
      lock_price: number;
      resolved_price: number | null;
      target_price: number | null;
      outcome: string;
      benchmark_pct: number | null;
      resolves_at: string;
    }[] = [];

    for (let i = 0; i < totalCalls; i++) {
      const ticker = pick(pool);
      const direction = Math.random() < 0.72 ? "long" : pick(DIRECTIONS);
      const lock = rand(ticker.endsWith(".TA") ? 80 : 40, ticker.endsWith(".TA") ? 1200 : 480);
      const horizon = pick([14, 21, 30, 45, 60, 90]);
      const ageDays = Math.floor(rand(8, 280));
      const isResolved = ageDays > horizon && Math.random() < 0.88;
      const type = Math.random() < 0.5 ? "research" : "call";

      const win = Math.random() < a.skill;
      const magnitude = rand(0.02, a.skill > 0.65 ? 0.22 : 0.14);
      const movePct =
        direction === "short" ? (win ? -magnitude : magnitude) : win ? magnitude : -magnitude;
      const resolvedPrice = isResolved ? Math.round(lock * (1 + movePct) * 100) / 100 : null;
      const target =
        direction === "hold"
          ? null
          : Math.round(lock * (direction === "short" ? 0.88 : 1.15) * 100) / 100;

      const titleFn = pick(RESEARCH_TITLES);
      const body =
        type === "research"
          ? `${a.name} on ${ticker}.\n\n${a.bio}\n\nThesis: ${direction} over ${horizon} days. Entry locked at publication. Risk: macro shock overwhelms the single-name view.\n\n[Demo seed content — not investment advice.]`
          : `${direction.toUpperCase()} ${ticker} · ${horizon}-day horizon. [Demo call]`;

      const access = pick(ACCESS);
      const { data: report } = await db
        .from("reports")
        .insert({
          author_id: id,
          type,
          title: type === "research" ? titleFn(ticker, direction) : `${direction.toUpperCase()} ${ticker}`,
          summary:
            type === "research"
              ? `${a.specialty}: ${ticker} over ${horizon} days — demo research by @${a.handle}.`
              : `${horizon}-day ${direction} on ${ticker}.`,
          status: "published",
          access,
          price: access === "paid" ? a.report : null,
          ticker,
          published_at: daysAgo(ageDays),
          locked_at: daysAgo(ageDays),
          created_at: daysAgo(ageDays),
          likes: Math.floor(rand(3, 420)),
          views: Math.floor(rand(80, 12_000)),
        })
        .select("id")
        .single();

      if (!report) continue;
      await db.from("report_bodies").insert({ report_id: (report as { id: string }).id, body });

      const outcome = isResolved
        ? gradeOutcome({ direction, lock_price: lock, target_price: target, resolved_price: resolvedPrice! })
        : "open";
      const benchmark = isResolved ? Math.round(rand(-6, 10) * 100) / 100 : null;
      const ret = isResolved ? callReturn(direction, lock, resolvedPrice) : null;
      const resolvesAt = isResolved
        ? daysAgo(Math.max(1, ageDays - horizon))
        : daysAhead(Math.max(3, horizon - (ageDays % horizon)));

      await db.from("predictions").insert({
        report_id: (report as { id: string }).id,
        author_id: id,
        ticker,
        direction,
        lock_price: lock,
        target_price: target,
        horizon_days: horizon,
        resolves_at: resolvesAt,
        resolved_price: resolvedPrice,
        bench_lock_price: Math.round(rand(380, 520) * 100) / 100,
        benchmark_pct: benchmark,
        return_pct: ret != null ? Math.round(ret * 100) / 100 : null,
        outcome,
        created_at: daysAgo(ageDays),
      });

      allPreds.push({
        direction,
        lock_price: lock,
        resolved_price: resolvedPrice,
        target_price: target,
        outcome,
        benchmark_pct: benchmark,
        resolves_at: resolvesAt,
      });
    }

    // Short posts (no prediction / track record).
    for (let p = 0; p < Math.floor(rand(2, 5)); p++) {
      await db.from("reports").insert({
        author_id: id,
        type: "short_post",
        summary: `${pick(pool)} — quick take: ${pick(["watching", "trimmed", "added", "on sidelines"])}. [Demo post]`,
        status: "published",
        access: "free",
        published_at: daysAgo(Math.floor(rand(1, 14))),
        locked_at: daysAgo(Math.floor(rand(1, 14))),
        created_at: daysAgo(Math.floor(rand(1, 14))),
        likes: Math.floor(rand(2, 120)),
        views: Math.floor(rand(30, 2000)),
      });
    }

    const result = computeScore(
      allPreds.map((p) => ({
        direction: p.direction,
        lock_price: p.lock_price,
        resolved_price: p.resolved_price,
        benchmark_pct: p.benchmark_pct,
        outcome: p.outcome as never,
        resolves_at: p.resolves_at,
      })),
    );
    const tier = computeTier(result.score, result.total);
    const followers = Math.floor(rand(150, a.skill > 0.65 ? 28_000 : 8000));

    await db
      .from("profiles")
      .update({
        score: result.score,
        rating: result.rating,
        tier: tier.key,
        wilson_win_rate: result.wilsonWinRate,
        profit_factor: result.profitFactor,
        avg_return: result.avgReturn,
        avg_alpha: result.avgAlpha,
        sample_size: result.total,
        followers_count: followers,
      })
      .eq("id", id);

    await db.from("moat_score_snapshots").insert({
      creator_id: id,
      score: result.score,
      sample_size: result.total,
      wilson_win_rate: result.wilsonWinRate,
      profit_factor: result.profitFactor,
      avg_return: result.avgReturn,
      avg_alpha: result.avgAlpha,
      breakdown: result.breakdown,
    });

    console.log(
      `  @${a.handle} — ${tier.label} · score ${result.score} · ${result.total} resolved · ${a.specialty}`,
    );
  }

  // Demo investor follows a slice of analysts.
  for (const analystId of analystIds.slice(0, 8)) {
    await db.from("follows").upsert(
      { follower_id: investorId, analyst_id: analystId },
      { onConflict: "follower_id,analyst_id" },
    );
  }

  console.log(`\nSeeded ${ANALYSTS.length} analysts with portraits and varied track records.`);
  console.log("Sign in: any handle@stoa.demo /", PASSWORD);
  console.log("Example: maren_vos@stoa.demo · marcus_webb@stoa.demo (legend tier)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
