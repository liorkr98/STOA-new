import "./load-env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { callReturn, computeScore, computeTier, gradeOutcome } from "../src/lib/engine/score";
import {
  ANALYSTS,
  CORE_TICKERS,
  DEMO_EMAIL_DOMAIN,
  DEMO_PASSWORD,
  buildCards,
  resolvedFor,
  type Intent,
  NOTE_TAKES,
  SECTOR_BY_TICKER,
  TAIL_TAKES,
  TAIL_TICKERS,
  TAKES,
  THEME_BY_TICKER,
  type AnalystSeed,
} from "./demo-data";

/**
 * Pass 1 of the demo dataset: 40 analysts and their publications, with resolved
 * and open calls, evidence-card stacks, comment threads, follows and paying
 * subscribers. No video, so Discover and Explore stay empty until pass 2.
 *
 * Every account is @stoa.demo, which is what `npm run demo:teardown` keys off.
 *
 * Run: npm run demo:seed
 */

const WINDOW_DAYS = 90;

const BASE_PRICE: Record<string, number> = {
  NVDA: 138, AVGO: 232, AMD: 164, MSFT: 428, TSLA: 246, XOM: 118, JPM: 232,
  "TEVA.TA": 6250, "NICE.TA": 61_400, "ESLT.TA": 121_000,
  AAPL: 228, GOOGL: 176, META: 572, AMZN: 186, NFLX: 704, CRM: 268, SNOW: 122,
  PLTR: 41, COIN: 214, UBER: 72, SHOP: 78, ARM: 132, MU: 104, INTC: 24,
  QCOM: 168, TSM: 182, LLY: 812, NVO: 118, PFE: 28, CVX: 152, OXY: 51,
  SLB: 43, GS: 512, BAC: 42, V: 288, MA: 486, CAT: 372, DE: 402, BA: 154, LMT: 582,
  "WIX.TA": 58_000, "MNDY.TA": 92_000, "CHKP.TA": 69_000, "POLI.TA": 3_450,
  "LUMI.TA": 3_180, "ICL.TA": 1_760, "TSEM.TA": 8_900,
};

const READERS = [
  { email: "investor@stoa.demo", handle: "demo_investor", name: "Demo Investor" },
  { email: "reader_dana@stoa.demo", handle: "reader_dana", name: "Dana Katz" },
  { email: "reader_omri@stoa.demo", handle: "reader_omri", name: "Omri Shaked" },
  { email: "reader_pauline@stoa.demo", handle: "reader_pauline", name: "Pauline Vidal" },
  { email: "reader_sam@stoa.demo", handle: "reader_sam", name: "Sam Whitfield" },
  { email: "reader_yael@stoa.demo", handle: "reader_yael", name: "Yael Brenner" },
  { email: "reader_marco@stoa.demo", handle: "reader_marco", name: "Marco Bianchi" },
  { email: "reader_ines@stoa.demo", handle: "reader_ines", name: "Ines Ferreira" },
];

const READER_COMMENTS = [
  "What invalidates this? You give a target but not a level where you would walk away.",
  "The interconnect point is the one I keep coming back to. Nobody models the queue.",
  "Been long since the last piece. The thesis has held up better than the price has.",
  "Respectfully I think the margin bridge is doing more work here than you admit.",
  "How much of this is already in consensus? Feels like the buy side got there first.",
  "Second source in a constrained market is the underrated part of this.",
  "Your last call on this name was early rather than wrong. Same risk here.",
  "Good piece. The comp math in the third card is what changed my mind.",
  "Where does this break if rates back up another 50bp?",
  "The volume versus price split is the detail everyone skips. Thanks for showing it.",
  "Not convinced. Same setup failed twice in 2023 for exactly this reason.",
  "Adding on weakness. The catalyst timeline alone is worth the unlock.",
];

const AUTHOR_REPLIES = [
  "Fair. Invalidation is a close below the lock price on volume, which I should have written into the card. Doing that now.",
  "Partly, yes. The sell-side got the direction and not the magnitude, and the magnitude is the whole trade.",
  "That is the right objection and it is the one in the steelman card. My answer is that the timing differs from 2023 because the supply response is slower now.",
  "Rates matter to the multiple, not the earnings path here. A 50bp move costs maybe two turns and does not touch the thesis.",
  "Early is a fair criticism of the last one. This time the catalyst is dated rather than open-ended.",
  "Appreciate it. The comp table took longer than the rest of the piece put together.",
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function chance(p: number) {
  return Math.random() < p;
}
function iso(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString();
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Recency-weighted age in days inside the publishing window. */
function weightedAge() {
  return Math.pow(Math.random(), 1.9) * WINDOW_DAYS;
}

function basePrice(ticker: string) {
  return BASE_PRICE[ticker] ?? 100;
}

async function ensureUser(db: SupabaseClient, email: string, meta: Record<string, string>) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
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

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/notionists/png?seed=${encodeURIComponent(seed)}&size=256&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
function coverUrl(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/400`;
}

/** Ticker for one publication: the analyst's own names most of the time, tail otherwise. */
function tickerFor(a: AnalystSeed) {
  if (a.tickers.length && chance(0.78)) return pick(a.tickers);
  return chance(0.55) ? pick(CORE_TICKERS) : pick(TAIL_TICKERS);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("your-project-ref") || key.startsWith("your-")) {
    throw new Error(
      "Supabase credentials are not set. Put a real NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.",
    );
  }
  const host = new URL(url).host;
  const allowProd = process.argv.includes("--allow-prod");
  const looksDev = /localhost|127\.0\.0\.1|dev|staging|preview/i.test(url);
  console.log(`Target: ${host}${looksDev ? " (looks like a dev target)" : ""}`);
  if (!looksDev && !allowProd) {
    throw new Error(
      `${host} does not look like a development project. Re-run with --allow-prod if this is deliberate.`,
    );
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  const rosterEmails = new Set([
    ...READERS.map((r) => r.email),
    ...ANALYSTS.map((a) => `${a.handle}${DEMO_EMAIL_DOMAIN}`),
  ]);
  const { data: existingList } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existingDemo = (existingList?.users ?? []).filter((u) => u.email?.endsWith(DEMO_EMAIL_DOMAIN));

  if (existingDemo.length > 0) {
    console.log(`Found ${existingDemo.length} existing @stoa.demo accounts. Clearing their content first.`);
    for (const u of existingDemo) {
      const { error } = await db.rpc("purge_demo_author", { p_author_id: u.id });
      if (error) console.error(`  could not clear ${u.email}: ${error.message}`);
    }
    const strays = existingDemo.filter((u) => !rosterEmails.has(u.email!));
    if (strays.length > 0) {
      console.log(
        `${strays.length} demo account(s) are not part of this roster and were left in place (content cleared, login intact):`,
      );
      for (const u of strays) {
        console.log(`  ${u.email}${u.last_sign_in_at ? ` (last sign-in ${u.last_sign_in_at.slice(0, 10)})` : " (never signed in)"}`);
      }
      console.log("  Remove them with: npm run demo:teardown");
    }
  }

  const readerIds: string[] = [];
  for (const r of READERS) {
    const id = await ensureUser(db, r.email, { display_name: r.name, handle: r.handle });
    readerIds.push(id);
    await db.from("profiles").update({ display_name: r.name, avatar_url: avatarUrl(r.handle) }).eq("id", id);
    await db.from("wallets").update({ balance: 500 }).eq("owner_id", id);
  }
  console.log(`Readers: ${readerIds.length}`);

  const analystIds: { id: string; a: AnalystSeed }[] = [];
  let totalPubs = 0;
  let totalCalls = 0;
  const outcomeTally: Record<string, number> = { hit: 0, near: 0, miss: 0, partial: 0, open: 0 };
  const tickerTally: Record<string, number> = {};

  for (const a of ANALYSTS) {
    const id = await ensureUser(db, `${a.handle}@stoa.demo`, { display_name: a.name, handle: a.handle });
    analystIds.push({ id, a });

    await db
      .from("profiles")
      .update({
        role: "analyst",
        display_name: a.name,
        headline: a.headline,
        bio: a.bio,
        verified: a.verified ?? false,
        sub_price: a.sub > 0 ? a.sub : null,
        report_price: a.report > 0 ? a.report : null,
        avatar_url: avatarUrl(a.handle),
        cover_url: coverUrl(`${a.handle}-cover`),
        followers_count: a.followers,
        created_at: iso(-a.joinedDaysAgo),
        profile_config: { specialty: a.specialty, layout: pick(["classic", "compact"]) },
      })
      .eq("id", id);

    const count = Math.round(rand(a.minPubs, a.maxPubs));
    const scoringCalls: Parameters<typeof computeScore>[0] = [];

    for (let i = 0; i < count; i++) {
      const ageDays = Math.min(weightedAge(), a.joinedDaysAgo);
      const roll = Math.random();
      const type = roll < 0.5 ? "call" : roll < 0.78 ? "research" : "short_post";
      const hasCall = type === "call" || (type === "research" && chance(0.42));

      const ticker = type === "short_post" && !hasCall ? (chance(0.45) ? tickerFor(a) : null) : tickerFor(a);
      const noteTake = !hasCall && !ticker ? pick(NOTE_TAKES) : null;

      let headline: string;
      let deck: string;
      let direction: "long" | "short" | "hold" = "long";

      if (noteTake) {
        headline = noteTake.headline;
        deck = noteTake.deck;
      } else {
        const sym = ticker!;
        const pool = TAKES[sym];
        const take = pool ? pick(pool) : { ...pick(TAIL_TAKES) };
        headline = take.headline.replace("{T}", sym.replace(".TA", ""));
        deck = take.deck.replace("{T}", sym.replace(".TA", ""));
        direction = take.d;
      }

      const themeTag = noteTake ? noteTake.tag : ticker ? THEME_BY_TICKER[ticker] ?? null : null;
      const primaryTag = ticker ? SECTOR_BY_TICKER[ticker] ?? null : (noteTake?.tag ?? null);

      const accessRoll = Math.random();
      const access = accessRoll < 0.5 ? "free" : accessRoll < 0.78 ? "paid" : "subscribers";
      const price = access === "paid" ? (a.report > 0 ? a.report : 5) : null;

      const views = Math.round(rand(120, 14_000) * (1 - ageDays / (WINDOW_DAYS * 2)));
      const likes = Math.round(views * rand(0.01, 0.06));

      const { data: reportRow, error: reportErr } = await db
        .from("reports")
        .insert({
          author_id: id,
          type,
          title: type === "short_post" ? null : headline,
          summary: deck,
          status: "published",
          access,
          price,
          ticker,
          primary_tag: primaryTag,
          theme_tag: themeTag,
          secondary_tags: a.tags.slice(0, 2),
          published_at: iso(-ageDays),
          locked_at: iso(-ageDays),
          created_at: iso(-ageDays),
          likes: Math.max(1, likes),
          views: Math.max(20, views),
        })
        .select("id")
        .single();

      if (reportErr || !reportRow) {
        console.error(`  insert failed for @${a.handle}: ${reportErr?.message}`);
        continue;
      }
      const reportId = (reportRow as { id: string }).id;
      totalPubs++;
      if (ticker) tickerTally[ticker] = (tickerTally[ticker] ?? 0) + 1;

      const body =
        type === "short_post"
          ? deck
          : `${deck}\n\nThe position: ${direction} with a defined invalidation level, sized to the catalyst rather than to conviction. Entry is locked at publication and the exit is dated.\n\nWhat would change my mind is written into the kill-switch card rather than left implicit. If the conditions there trigger, the call closes early and takes the mark.\n\nRisk: a macro shock large enough to overwhelm the single-name view. That risk is not hedged here and it is the main reason to size this smaller than the conviction implies.`;
      await db.from("report_bodies").insert({ report_id: reportId, body });

      let target: number | null = null;
      let lock = 0;

      if (hasCall && ticker) {
        totalCalls++;
        lock = round2(basePrice(ticker) * rand(0.88, 1.12));
        const horizon = pick([7, 14, 21, 30, 45, 60, 90]);
        const targetPct = rand(0.07, 0.2);
        target =
          direction === "hold"
            ? null
            : round2(lock * (direction === "short" ? 1 - targetPct : 1 + targetPct));

        const isResolved = ageDays > horizon;
        let outcome = "open";
        let resolvedPrice: number | null = null;
        let ret: number | null = null;
        let benchmark: number | null = null;

        if (isResolved) {
          const r = Math.random();
          const intent: Intent = r < a.skill * 0.72 ? "hit" : r < a.skill * 0.72 + 0.22 ? "near" : "miss";
          resolvedPrice = resolvedFor(intent, direction, lock, target);
          outcome = gradeOutcome({ direction, lock_price: lock, target_price: target, resolved_price: resolvedPrice });
          ret = callReturn(direction, lock, resolvedPrice);
          benchmark = round2(rand(-5, 9));
        }
        outcomeTally[outcome] = (outcomeTally[outcome] ?? 0) + 1;

        const resolvesAt = isResolved
          ? iso(-(ageDays - horizon))
          : iso(chance(0.22) ? rand(1, 5) : rand(6, horizon));

        await db.from("predictions").insert({
          report_id: reportId,
          author_id: id,
          ticker,
          direction,
          lock_price: lock,
          target_price: target,
          horizon_days: horizon,
          resolves_at: resolvesAt,
          resolved_price: resolvedPrice,
          bench_lock_price: round2(rand(4_200, 5_900)),
          benchmark_pct: benchmark,
          return_pct: ret != null ? round2(ret) : null,
          outcome,
          created_at: iso(-ageDays),
        });

        scoringCalls.push({
          direction,
          lock_price: lock,
          resolved_price: resolvedPrice,
          benchmark_pct: benchmark,
          outcome: outcome as never,
          resolves_at: resolvesAt,
        });
      }

      if (chance(0.34)) {
        const cards = buildCards(reportId, headline, deck, ticker, target, lock || basePrice(ticker ?? "NVDA"));
        if (chance(0.45)) {
          cards.push({
            report_id: reportId,
            position: cards.length,
            kind: "steelman",
            locked: chance(0.4),
            payload: pick(STEELMEN),
          });
        }
        const { error: cardErr } = await db.from("publication_cards").insert(cards);
        if (cardErr) console.error(`  cards failed: ${cardErr.message}`);
      }

      if (views > 5_000 && chance(0.75)) {
        const n = Math.round(rand(2, 6));
        for (let c = 0; c < n; c++) {
          const commenterId = pick(readerIds);
          const at = iso(-(ageDays - rand(0, Math.min(ageDays, 3))));
          const { data: parent } = await db
            .from("comments")
            .insert({ report_id: reportId, author_id: commenterId, body: pick(READER_COMMENTS), likes: Math.round(rand(0, 40)), created_at: at })
            .select("id")
            .single();

          if (parent && chance(0.5)) {
            const replyAuthor = chance(0.65) ? id : pick(readerIds);
            await db.from("comments").insert({
              report_id: reportId,
              author_id: replyAuthor,
              parent_id: (parent as { id: string }).id,
              body: replyAuthor === id ? pick(AUTHOR_REPLIES) : pick(READER_COMMENTS),
              likes: Math.round(rand(0, 25)),
              created_at: iso(-(ageDays - rand(0, Math.min(ageDays, 2)))),
            });
          }
        }
        const { count: cc } = await db.from("comments").select("id", { count: "exact", head: true }).eq("report_id", reportId);
        await db.from("reports").update({ comment_count: cc ?? 0 }).eq("id", reportId);
      }
    }

    const result = computeScore(scoringCalls);
    const tier = computeTier(result.score, result.total);
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

    console.log(`  @${a.handle}: ${count} publications, ${result.total} resolved calls`);
  }

  for (const readerId of readerIds) {
    const following = [...analystIds].sort(() => Math.random() - 0.5).slice(0, Math.round(rand(6, 16)));
    for (const { id } of following) {
      await db.from("follows").upsert({ follower_id: readerId, analyst_id: id }, { onConflict: "follower_id,analyst_id" });
    }
    const paying = following.filter((f) => f.a.sub > 0).slice(0, Math.round(rand(1, 3)));
    for (const { id, a } of paying) {
      await db.from("subscriptions").upsert(
        { subscriber_id: readerId, analyst_id: id, status: "active", price: a.sub, started_at: iso(-rand(10, 120)), renews_at: iso(rand(3, 28)) },
        { onConflict: "subscriber_id,analyst_id" },
      );
    }
  }

  const topTickers = Object.entries(tickerTally).sort((x, y) => y[1] - x[1]).slice(0, 12);
  console.log(`\nSeeded ${ANALYSTS.length} analysts, ${totalPubs} publications, ${totalCalls} calls.`);
  console.log(`Outcomes: ${Object.entries(outcomeTally).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  console.log(`Top coverage: ${topTickers.map(([t, n]) => `${t} ${n}`).join(", ")}`);
  console.log(`Sign in as any handle@stoa.demo with password ${DEMO_PASSWORD}`);
  console.log("Remove everything with: npm run demo:teardown");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
