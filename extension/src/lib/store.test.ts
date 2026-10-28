import assert from "node:assert/strict";
import { test } from "node:test";
import { heldTickers, weekCounts } from "./store.ts";
import type { LocalTap, SiteWeek, StoaSession } from "./types.ts";

const now = new Date(2026, 9, 28, 12);
const session: StoaSession = { accessToken: "a", refreshToken: "r", expiresAt: 0, userId: "u1", email: "x@y.z" };
const tap = (ticker: string, direction: "bull" | "bear", extra: Partial<LocalTap> = {}): LocalTap => ({
  id: Math.random().toString(36), ticker, direction, videoId: "v", videoChannel: null, videoSeconds: 1,
  at: now.toISOString(), userId: "u1", status: "sent", undone: false, ...extra,
});
const site: SiteWeek = { userId: "u1", weekStart: "2026-10-26", rows: [{ ticker: "JPM", bull: 2, bear: 0 }], syncedAt: now.toISOString() };

test("site counts plus taps the site does not have yet, sides apart", () => {
  const rows = weekCounts({ session, siteWeek: site, taps: [tap("JPM", "bull"), tap("JPM", "bear"), tap("GS", "bull", { status: "delivered" })] }, now);
  assert.deepEqual(rows, [{ ticker: "JPM", bull: 3, bear: 1 }]);
});

test("undone taps stop counting, before and after delivery", () => {
  const rows = weekCounts({ session, siteWeek: site, taps: [tap("JPM", "bull", { undone: true }), tap("JPM", "bull", { status: "delivered", undone: true })] }, now);
  assert.deepEqual(rows, [{ ticker: "JPM", bull: 1, bear: 0 }]);
});

test("signed out: only the held taps; last week's taps never count", () => {
  const rows = weekCounts({ session: null, siteWeek: null, taps: [tap("NVDA", "bull", { userId: null, status: "held" }), tap("AAPL", "bull", { userId: null, status: "held", at: "2026-10-20T10:00:00Z" })] }, now);
  assert.deepEqual(rows, [{ ticker: "NVDA", bull: 1, bear: 0 }]);
});

test("the save card counts held stocks, not taps", () => {
  assert.deepEqual(heldTickers([tap("A", "bull", { status: "held" }), tap("A", "bear", { status: "held" }), tap("B", "bull", { status: "held", undone: true })]), ["A"]);
});
