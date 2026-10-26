/**
 * The cart panel's week as rendered: remove controls on the current week
 * only, named for the ticker, the summary line, the empty state, and the nav
 * badge after a removal. Part of `npm run test:cart`.
 */
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("@/app/actions/interest-cart", { namedExports: { cartTickerInfo: async () => ({}), interestCartAccess: async () => ({ open: true, recheck: false }) } });

const { WeekContents, weekSummary } = await import("@/components/interest-cart/cart-panel");
const { cartMarkLabel } = await import("@/components/interest-cart/cart-trigger-impl");
const { without } = await import("@/components/interest-cart/cart-runtime");
const { summariseWeek } = await import("@/lib/interest-cart/cart");

const tap = (ticker: string, direction: "bull" | "bear") => ({ id: Math.random().toString(36), userId: "u", ticker, direction, source: "site" as const, videoId: null, videoChannel: null, videoSeconds: null, createdAt: "2026-10-13T10:00:00.000Z" });
const week = summariseWeek("2026-10-12", [...Array(7)].map(() => tap("NVDA", "bull")).concat([tap("NVDA", "bear"), tap("TSLA", "bear")]));
type WeekProps = Parameters<typeof WeekContents>[0];
const render = (props: Pick<WeekProps, "week" | "current" | "onRemove">) =>
  renderToStaticMarkup(h(WeekContents, { lastWeek: null, info: () => undefined, leaveTo: () => () => undefined, ...props }));

test("the current week's rows each carry a remove control named for the ticker", () => {
  const html = render({ week, current: true, onRemove: () => undefined });
  assert.match(html, /aria-label="Remove NVDA from this week"/);
  assert.match(html, /aria-label="Remove TSLA from this week"/);
  assert.equal(html.match(/from this week"/g)?.length, 2);
});

test("a past week renders no remove control", () => {
  const html = render({ week, current: false, onRemove: () => undefined });
  assert.doesNotMatch(html, /Remove/);
});

test("the summary line follows the week", () => {
  assert.equal(weekSummary(week, true), "2 tickers · 9 taps · resets Monday");
  const after = summariseWeek("2026-10-12", [tap("TSLA", "bear")]);
  assert.equal(weekSummary(after, true), "1 ticker · 1 tap · resets Monday");
  assert.match(render({ week: after, current: true, onRemove: () => undefined }), /1 ticker · 1 tap/);
});

test("removing the last ticker shows the existing empty state", () => {
  const html = render({ week: summariseWeek("2026-10-12", []), current: true, onRemove: () => undefined });
  assert.match(html, /Nothing in your cart this week/);
  assert.doesNotMatch(html, /Remove/);
});

test("the nav badge drops at once on removal and comes back on Undo", () => {
  assert.equal(cartMarkLabel(week.taps), "Your cart, 9 taps this week");
  const removed = without(week, "NVDA");
  assert.deepEqual(removed, summariseWeek("2026-10-12", [tap("TSLA", "bear")]), "the on-screen week matches what the store will return");
  assert.equal(cartMarkLabel(removed.taps), "Your cart, 1 tap this week");
  assert.equal(cartMarkLabel(without(removed, "TSLA").taps), "Your cart");
  assert.equal(without(week, "AAPL"), week, "removing a ticker not in the week changes nothing");
});
