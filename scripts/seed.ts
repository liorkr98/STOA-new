import "./load-env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Seeds the marketplace with diverse demo analysts, an investor, and research
 * carrying a stance (a ticker and a direction). Nothing is graded.
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
  /** Reach: above 0.58 the analyst is verified, and the follower band widens above 0.65. */
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
    bio: "Former PM at a long-only fund. I publish a few high-conviction views per quarter.",
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

  // The email is the documented demo login and must not change; the display
  // name and handle are public on every comment, so they read as a person.
  const investorId = await ensureUser(db, "investor@stoa.demo", {
    display_name: "Noa Bergman",
    handle: "noa_bergman",
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

    for (let i = 0; i < totalCalls; i++) {
      const ticker = pick(pool);
      const direction = Math.random() < 0.72 ? "long" : pick(DIRECTIONS);
      const horizon = pick([14, 21, 30, 45, 60, 90]);
      const ageDays = Math.floor(rand(8, 280));

      const titleFn = pick(RESEARCH_TITLES);
      const body = `${a.name} on ${ticker}.\n\n${a.bio}\n\nThesis: ${direction} over ${horizon} days. Risk: macro shock overwhelms the single-name view.\n\n[Demo seed content — not investment advice.]`;

      const access = pick(ACCESS);
      const { data: report } = await db
        .from("reports")
        .insert({
          author_id: id,
          type: "research",
          title: titleFn(ticker, direction),
          summary: `${a.specialty}: ${ticker} over ${horizon} days — demo research by @${a.handle}.`,
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
      const reportId = (report as { id: string }).id;
      await db.from("report_bodies").insert({ report_id: reportId, body });
      // Tolerated before migration 0065 adds the column: the piece keeps its ticker.
      await db.from("reports").update({ stance: direction }).eq("id", reportId);
    }

    // Short posts, with no stance.
    for (let p = 0; p < Math.floor(rand(2, 5)); p++) {
      // A short post still needs a headline: without one the report page has no
      // H1 and every list falls back to rendering the summary as the title,
      // which is how "[Demo post]" ended up reading as a publication title.
      const stanceWord = pick(["watching", "trimmed", "added", "staying on the sidelines"]);
      const line = pick(pool);
      await db.from("reports").insert({
        author_id: id,
        type: "short_post",
        title: `Quick take: ${line}`,
        summary: `${line} Position: ${stanceWord}.`,
        status: "published",
        access: "free",
        published_at: daysAgo(Math.floor(rand(1, 14))),
        locked_at: daysAgo(Math.floor(rand(1, 14))),
        created_at: daysAgo(Math.floor(rand(1, 14))),
        likes: Math.floor(rand(2, 120)),
        views: Math.floor(rand(30, 2000)),
      });
    }

    const followers = Math.floor(rand(150, a.skill > 0.65 ? 28_000 : 8000));

    await db
      .from("profiles")
      .update({
        followers_count: followers,
      })
      .eq("id", id);

    console.log(`  @${a.handle} — ${totalCalls} publications · ${a.specialty}`);
  }

  // Demo investor follows a slice of analysts.
  for (const analystId of analystIds.slice(0, 8)) {
    await db.from("follows").upsert(
      { follower_id: investorId, analyst_id: analystId },
      { onConflict: "follower_id,analyst_id" },
    );
  }

  console.log(`\nSeeded ${ANALYSTS.length} analysts with portraits.`);
  console.log("Sign in: any handle@stoa.demo /", PASSWORD);
  console.log("Example: maren_vos@stoa.demo · marcus_webb@stoa.demo");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
