/**
 * The cart's data rules. Run with `npm run test:cart` (TZ is pinned to
 * Asia/Jerusalem there so a week crossing the October clock change is real).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const memory = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
    },
    dispatchEvent: () => true,
  },
});

const { createInterestCart, summariseWeek } = await import("@/lib/interest-cart/cart");
const { TemporaryLocalCartStore } = await import("@/lib/interest-cart/store");
const { holdTap, readHeldTap, clearHeldTap, returnAfterTap } = await import("@/lib/interest-cart/held-tap");
const { weekStartOf, addWeeks, weekKey, weekRangeLabel, weekBounds } = await import("@/lib/interest-cart/week");

function fresh(userId = "u1") {
  memory.clear();
  return createInterestCart(new TemporaryLocalCartStore(), userId);
}

test("a week starts on Monday at local midnight", () => {
  const tue = new Date(2026, 9, 13, 15, 30);
  assert.equal(weekKey(weekStartOf(tue)), "2026-10-12");
  assert.equal(weekKey(weekStartOf(new Date(2026, 9, 12, 0, 0))), "2026-10-12");
  assert.equal(weekKey(weekStartOf(new Date(2026, 9, 11, 23, 59))), "2026-10-05");
  assert.equal(weekRangeLabel(weekStartOf(tue)), "12-18 Oct");
  assert.equal(weekRangeLabel(new Date(2026, 8, 28)), "28 Sep-4 Oct");
});

test("a week that crosses a clock change still ends at local midnight", () => {
  const start = new Date(2026, 9, 19);
  const next = addWeeks(start, 1);
  assert.equal(next.getHours(), 0);
  assert.equal(weekKey(next), "2026-10-26");
  const { fromIso, toIso } = weekBounds(start);
  assert.equal(new Date(toIso).getTime(), next.getTime());
  assert.ok(new Date(toIso).getTime() - new Date(fromIso).getTime() >= 7 * 24 * 3600 * 1000);
});

test("bull and bear are counted apart and rows sort by total", async () => {
  const cart = fresh();
  const at = new Date(2026, 9, 13, 10);
  for (let i = 0; i < 7; i++) await cart.addTap("nvda", "bull", "site", { at });
  for (let i = 0; i < 6; i++) await cart.addTap("NVDA", "bear", "site", { at });
  await cart.addTap("TSLA", "bear", "site", { at });
  const week = await cart.getWeek(at);
  assert.deepEqual(week.rows[0], { ticker: "NVDA", bull: 7, bear: 6, total: 13 });
  assert.deepEqual(week.rows[1], { ticker: "TSLA", bull: 0, bear: 1, total: 1 });
  assert.equal(week.tickers, 2);
  assert.equal(week.taps, 14);
  assert.ok(!("net" in week.rows[0]));
});

test("taps land in the local week they were made in, and older weeks stay", async () => {
  const cart = fresh();
  await cart.addTap("AAPL", "bull", "site", { at: new Date(2026, 9, 11, 23, 59) });
  await cart.addTap("AAPL", "bull", "site", { at: new Date(2026, 9, 12, 0, 1) });
  assert.equal((await cart.getWeek("2026-10-05")).taps, 1);
  assert.equal((await cart.getWeek("2026-10-12")).taps, 1);
  assert.deepEqual(await cart.listWeeks(), ["2026-10-12", "2026-10-05"]);
});

test("undo removes only the newest tap on that ticker", async () => {
  const cart = fresh();
  await cart.addTap("AMD", "bull", "site", { at: new Date(2026, 9, 13, 9) });
  await cart.addTap("AMD", "bear", "site", { at: new Date(2026, 9, 13, 10) });
  const removed = await cart.undoLastTap("AMD");
  assert.equal(removed?.direction, "bear");
  const row = (await cart.getWeek(new Date(2026, 9, 13))).rows[0];
  assert.deepEqual(row, { ticker: "AMD", bull: 1, bear: 0, total: 1 });
  assert.equal(await cart.undoLastTap("MSFT"), null);
});

test("every tap records its source; video fields only on extension taps", async () => {
  const cart = fresh();
  const site = await cart.addTap("NVDA", "bull", "site", { videoId: "x" });
  assert.equal(site.tap.source, "site");
  assert.equal(site.tap.videoId, null);
  const ext = await cart.addTap("NVDA", "bull", "extension", { videoId: "dQw4", videoChannel: "UC1", videoSeconds: 84 });
  assert.deepEqual(
    [ext.tap.source, ext.tap.videoId, ext.tap.videoChannel, ext.tap.videoSeconds],
    ["extension", "dQw4", "UC1", 84],
  );
});

test("each person reads only their own taps", async () => {
  memory.clear();
  const store = new TemporaryLocalCartStore();
  await createInterestCart(store, "a").addTap("NVDA", "bull", "site");
  assert.equal((await createInterestCart(store, "b").getWeek(new Date())).taps, 0);
});

test("a held tap replays exactly once, even if the page reloads mid-replay", async () => {
  const cart = fresh("new-user");
  const held = holdTap("NVDA", "bull");
  // First attempt writes the tap, then the page reloads before the clear.
  const first = await cart.addTap(held.ticker, held.direction, "site", { id: held.id });
  assert.equal(first.inserted, true);
  // After the reload the held tap is still there and replays again.
  const again = readHeldTap();
  assert.ok(again);
  const second = await cart.addTap(again.ticker, again.direction, "site", { id: again.id });
  assert.equal(second.inserted, false);
  clearHeldTap(again.id);
  assert.equal(readHeldTap(), null);
  assert.equal((await cart.getWeek(new Date())).rows[0].bull, 1);
});

test("a stale held tap is dropped, not replayed into a later week", () => {
  memory.clear();
  holdTap("NVDA", "bear");
  assert.equal(readHeldTap(new Date(Date.now() + 25 * 3600 * 1000)), null);
});

test("summariseWeek of nothing is an empty week", () => {
  assert.deepEqual(summariseWeek("2026-10-12", []), { weekStart: "2026-10-12", rows: [], tickers: 0, taps: 0 });
});

test("the week's price move is the last close in the week over the close before it", async () => {
  const { weekMove } = await import("@/lib/interest-cart/price");
  const day = (d: number, close: number) => ({ time: Date.UTC(2026, 9, d, 20) / 1000, open: close, high: close, low: close, close });
  const from = new Date(Date.UTC(2026, 9, 12)).toISOString();
  const to = new Date(Date.UTC(2026, 9, 19)).toISOString();
  const pct = weekMove([day(8, 90), day(9, 100), day(12, 101), day(14, 103.1), day(19, 120)], from, to);
  assert.equal(pct?.toFixed(1), "3.1");
  assert.equal(weekMove([day(9, 100)], from, to), null);
});

test("a signed-out tap returns to its page after sign-up, the landing page to the ticker", () => {
  assert.equal(returnAfterTap("/", "", "msft"), "/markets/MSFT", "the landing page would bounce a member to Today");
  assert.equal(returnAfterTap("/markets/NVDA", "", "NVDA"), "/markets/NVDA");
  assert.equal(returnAfterTap("/search", "?q=nv", "NVDA"), "/search?q=nv");
});

/* ---------- Removing a ticker from the week ---------- */

const NOW = new Date(2026, 9, 14, 12); // Wednesday, week of 12 Oct
const stored = (userId = "u1") => JSON.parse(memory.get(`stoa:cart:v1:${userId}`) ?? "[]") as Array<Record<string, unknown>>;

async function seededWeek() {
  const cart = fresh();
  const at = new Date(2026, 9, 13, 10);
  for (let i = 0; i < 7; i++) await cart.addTap("NVDA", "bull", "site", { at });
  await cart.addTap("NVDA", "bear", "site", { at });
  await cart.addTap("TSLA", "bear", "site", { at });
  return cart;
}

test("remove: the whole ticker leaves the week, both sides, and the totals follow", async () => {
  const cart = await seededWeek();
  const done = await cart.removeTicker("nvda", NOW);
  assert.equal(done?.removed, 8);
  const week = await cart.getWeek(NOW);
  assert.deepEqual(week.rows, [{ ticker: "TSLA", bull: 0, bear: 1, total: 1 }]);
  assert.equal(week.tickers, 1);
  assert.equal(week.taps, 1, "the nav badge reads this week's taps");
});

test("remove is a soft delete: every tap is kept, marked, under one removal id", async () => {
  const cart = await seededWeek();
  const done = await cart.removeTicker("NVDA", NOW);
  const rows = stored();
  assert.equal(rows.length, 9, "no tap was deleted");
  const nvda = rows.filter((t) => t.ticker === "NVDA");
  assert.ok(nvda.every((t) => t.removalId === done?.removalId && t.removedReason === "remove" && typeof t.removedAt === "string"));
  assert.ok(rows.filter((t) => t.ticker === "TSLA").every((t) => !t.removedAt));
});

test("undo restores the row and the count exactly", async () => {
  const cart = await seededWeek();
  const before = await cart.getWeek(NOW);
  const done = await cart.removeTicker("NVDA", NOW);
  assert.equal(await cart.restoreRemoval(done!.removalId), 8);
  assert.deepEqual(await cart.getWeek(NOW), before);
  assert.ok(stored().every((t) => !t.removedAt && !t.removalId));
});

test("removing the last ticker leaves an empty week", async () => {
  const cart = fresh();
  await cart.addTap("AMD", "bull", "site", { at: new Date(2026, 9, 13, 9) });
  await cart.removeTicker("AMD", NOW);
  const week = await cart.getWeek(NOW);
  assert.equal(week.taps, 0);
  assert.equal(week.tickers, 0);
  assert.deepEqual(await cart.listWeeks(), [], "an emptied week does not count as a week with taps");
});

test("past weeks cannot be edited: removing only ever touches the current week", async () => {
  const cart = fresh();
  await cart.addTap("NVDA", "bull", "site", { at: new Date(2026, 9, 7, 10) }); // last week
  await cart.addTap("NVDA", "bull", "site", { at: new Date(2026, 9, 13, 10) }); // this week
  await cart.removeTicker("NVDA", NOW);
  assert.deepEqual((await cart.getWeek("2026-10-05")).rows, [{ ticker: "NVDA", bull: 1, bear: 0, total: 1 }]);
  assert.equal((await cart.getWeek(NOW)).taps, 0);
  assert.equal(await cart.removeTicker("NVDA", NOW), null, "nothing left to remove this week");
});

test("removed taps stay removed across a reload", async () => {
  const cart = await seededWeek();
  await cart.removeTicker("NVDA", NOW);
  const reloaded = createInterestCart(new TemporaryLocalCartStore(), "u1");
  assert.deepEqual((await reloaded.getWeek(NOW)).rows.map((r) => r.ticker), ["TSLA"]);
});

test("re-tapping a removed ticker the same week starts a fresh count; the removed taps stay removed", async () => {
  const cart = await seededWeek();
  const done = await cart.removeTicker("NVDA", NOW);
  await cart.addTap("NVDA", "bear", "site", { at: NOW });
  const row = (await cart.getWeek(NOW)).rows.find((r) => r.ticker === "NVDA");
  assert.deepEqual(row, { ticker: "NVDA", bull: 0, bear: 1, total: 1 });
  assert.equal(stored().filter((t) => t.removalId === done?.removalId).length, 8);
});

test("the tap toast's Undo is a soft delete too", async () => {
  const cart = fresh();
  await cart.addTap("AMD", "bull", "site", { at: new Date(2026, 9, 13, 9) });
  await cart.undoLastTap("AMD", NOW);
  assert.equal((await cart.getWeek(NOW)).taps, 0);
  const [tap] = stored();
  assert.equal(tap.removedReason, "undo");
  assert.equal(await cart.undoLastTap("AMD", NOW), null, "an undone tap is not undone twice");
});

test("taps stored before removal existed still count", async () => {
  memory.clear();
  memory.set("stoa:cart:v1:u1", JSON.stringify([{ id: "old", userId: "u1", ticker: "IBM", direction: "bull", source: "site", videoId: null, videoChannel: null, videoSeconds: null, createdAt: new Date(2026, 9, 13, 9).toISOString() }]));
  const cart = createInterestCart(new TemporaryLocalCartStore(), "u1");
  assert.equal((await cart.getWeek(NOW)).taps, 1);
});
