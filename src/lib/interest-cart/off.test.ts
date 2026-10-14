/**
 * The Interest Cart with FEATURE_INTEREST_CART off: nothing of it renders.
 * `npm run test:cart-off`, in CI beside the on-state suites. Delete at launch
 * together with the flag.
 */
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { createElement as h, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";

assert.ok(!process.env.FEATURE_INTEREST_CART || process.env.FEATURE_INTEREST_CART === "off", "run with the flag off");

// The private sidebar's Sign out posts to a server action; stand it in so the
// test renders the sidebar without a server.
mock.module("@/app/actions/auth", { namedExports: { signOut: async () => undefined } });

const { PathnameContext } = await import("next/dist/shared/lib/hooks-client-context.shared-runtime");
const { CartTap } = await import("@/components/interest-cart/cart-tap");
const { CartTrigger } = await import("@/components/interest-cart/cart-trigger");
const { InterestCartGate } = await import("@/components/interest-cart/gate");
const { StanceChip } = await import("@/components/ui/chip");
const { StanceCard } = await import("@/components/feed/stance-card");
const { PeerTile } = await import("@/components/markets/peer-tile");
const { SearchTickerCard } = await import("@/components/search/search-ticker-card");
const { PrivateSidebar, PrivateMobileNav } = await import("@/components/layout/private-sidebar");

const at = (path: string, node: unknown, props: object = {}) =>
  renderToStaticMarkup(h(PathnameContext.Provider, { value: path }, h(node as FunctionComponent<object>, props)));

const CART_MARKS = /Add a (bull|bear) tap|Your cart|cart-inline|M 6\.99 7\.99|data-cart/;

test("no tap control renders, on any surface that carries one", () => {
  assert.equal(at("/markets", CartTap, { ticker: "NVDA" }), "");
  const card = at("/feed", StanceCard, { pub: { ticker: "NVDA", direction: "long", sector: "Semis", themeTag: null } });
  assert.doesNotMatch(card, CART_MARKS);
  const peer = at("/markets/NVDA", PeerTile, { symbol: "AMD", name: "AMD", lastPrice: 100, publications: 2 });
  assert.match(peer, /^<a [^>]*class="stock-peer focus-ring"/, "the peer tile is the plain link it was on main");
  assert.doesNotMatch(peer, CART_MARKS);
  const hit = at("/search", SearchTickerCard, { ticker: "NVDA", name: "NVIDIA", sector: "Semis" });
  assert.match(hit, /^<a [^>]*class="rounded-panel border/, "the search card is the plain link it was on main");
  assert.doesNotMatch(hit, CART_MARKS);
});

test("no nav mark and nothing mounted by the gate", () => {
  assert.equal(at("/home", CartTrigger), "");
  assert.equal(at("/home", InterestCartGate), "");
});

test("no My Stoa > Cart entry", () => {
  const profile = { id: "u", role: "investor", display_name: "Reader", handle: "reader", avatar_url: null };
  const desk = at("/saved", PrivateSidebar, { profile });
  assert.match(desk, />Library</, "the desktop rail rendered its Reading group");
  assert.doesNotMatch(desk, />Cart</);
  // The phone's groups render closed; the Cart entry would sit in Reading.
  const phone = at("/saved", PrivateMobileNav, { profile });
  assert.match(phone, />Reading</);
  assert.doesNotMatch(phone, />Cart</);
});

test("the cart has no address of its own", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = `${dir}/${name}`;
      return statSync(path).isDirectory() ? [path, ...walk(path)] : [];
    });
  const routes = walk("src/app").filter((d) => /(^|\/)cart$/i.test(d));
  assert.deepEqual(routes, []);
});

test("stances keep their green and red, exactly as on main", () => {
  assert.match(at("/home", StanceChip, { direction: "long" }), /text-gain/);
  assert.match(at("/home", StanceChip, { direction: "short" }), /text-loss/);
  const card = at("/feed", StanceCard, { pub: { ticker: "NVDA", direction: "short", sector: null, themeTag: null } });
  assert.match(card, /text-loss/);
  assert.match(card, /pr-3/, "the stance card keeps main's padding");
});
