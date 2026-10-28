import assert from "node:assert/strict";
import { test } from "node:test";
import { createResolver, normaliseName, type SymbolEntry } from "@/lib/extension/detect/resolve";
import { applyRules, type Mention } from "@/lib/extension/detect/rules";

const symbols: SymbolEntry[] = [
  { symbol: "GS", name: "Goldman Sachs Group, Inc. (The)", exchange: "NYSE", marketCap: 1 },
  { symbol: "CEG", name: "Constellation Energy Corporation - Common Stock When-Issued", exchange: "NASDAQ", marketCap: 1 },
  { symbol: "META", name: "Meta Platforms, Inc.", exchange: "NASDAQ", marketCap: 1 },
  { symbol: "APP", name: "Applovin Corporation", exchange: "NASDAQ", marketCap: 1 },
  { symbol: "MRVL", name: "Marvell Technology, Inc. -", exchange: "NASDAQ", marketCap: 2 },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", marketCap: 5 },
  { symbol: "GOOG", name: "Alphabet Inc.", exchange: "NASDAQ", marketCap: 4 },
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", marketCap: 9 },
  { symbol: "APLE", name: "Apple Hospitality REIT, Inc.", exchange: "NYSE", marketCap: 1 },
  { symbol: "KHC", name: "The Kraft Heinz Company -", exchange: "NASDAQ", marketCap: 1 },
  { symbol: "UMAC", name: "Unusual Machines, Inc.", exchange: "AMEX", marketCap: 1 },
  { symbol: "JPM", name: "JP Morgan Chase & Co.", exchange: "NYSE", marketCap: 9 },
];
const resolve = createResolver(symbols);

test("names normalise to the words that identify the company", () => {
  assert.equal(normaliseName("The Kraft Heinz Company -"), "kraft heinz");
  assert.equal(normaliseName("Constellation Energy Corporation - Common Stock When-Issued"), "constellation energy");
  assert.equal(normaliseName("McDonald's Corp"), "mcdonalds");
});

test("garbled captions resolve through the alias table", () => {
  assert.equal(resolve("Goldman Sachs", "גולמן סקס")?.ticker, "GS");
  assert.equal(resolve("CG", "CG")?.ticker, "CEG");
  assert.equal(resolve("מתה", "מתה")?.ticker, "META");
  assert.equal(resolve("app 111", "app 111")?.ticker, "APP");
  assert.equal(resolve("Marll", "Marll")?.ticker, "MRVL");
});

test("official names resolve against the symbol list", () => {
  assert.equal(resolve("Alphabet Inc.", "Google")?.ticker, "GOOGL");
  assert.equal(resolve("Unusual Machines", "UMAC")?.ticker, "UMAC");
  assert.equal(resolve("Kraft Heinz", "")?.ticker, "KHC");
  assert.equal(resolve("Apple", "")?.ticker, "AAPL");
});

test("funds resolve and are labelled ETF; unknown names are dropped", () => {
  assert.deepEqual(resolve("Financial Select Sector SPDR Fund", "XLF"), { ticker: "XLF", name: "Financial Select Sector SPDR Fund", etf: true });
  assert.equal(resolve("Some Private Startup", "")?.ticker, undefined);
  assert.equal(resolve("Bitcoin", "איביט")?.ticker, "IBIT");
});

const m = (company: string, start: number, end: number, extra: Partial<Mention> = {}): Mention => ({
  heard_as: company, company, asset_type: "company", start_seconds: start, end_seconds: end,
  role: "main_discussion", speaker_stance: "bullish", explicit_rating: "none", conditional: false, what: "", ...extra,
});

test("45 seconds or an explicit rating earn a card; a quick pick with a side earns a chip", () => {
  const out = applyRules(
    [
      m("Goldman Sachs", 100, 150),
      m("Apple", 300, 310, { role: "quick_pick" }),
      m("Meta Platforms", 400, 410, { explicit_rating: "avoid", speaker_stance: "bearish" }),
      m("Kraft Heinz", 500, 510, { speaker_stance: "neutral" }),
    ],
    resolve,
  );
  assert.deepEqual(out.map((v) => [v.ticker, v.kind, v.stance]), [["GS", "card", "bull"], ["AAPL", "line", "bull"], ["META", "card", "bear"]]);
});

test("noise is filtered: calendars, examples, portfolios, sponsors, indexes", () => {
  const out = applyRules(
    [
      m("Goldman Sachs", 0, 100, { role: "earnings_calendar" }),
      m("Apple", 0, 100, { role: "passing_example" }),
      m("Alphabet", 0, 100, { role: "portfolio_list" }),
      m("Unusual Machines", 0, 100, { role: "sponsor" }),
      m("S&P 500", 0, 100, { asset_type: "index" }),
    ],
    resolve,
  );
  assert.equal(out.length, 0);
});

test("stretches add up, and the card sits on the longest one", () => {
  const out = applyRules([m("Goldman Sachs", 10, 30), m("גולמן סקס", 200, 230, { conditional: true })], resolve);
  assert.equal(out.length, 1);
  assert.deepEqual([out[0]!.kind, out[0]!.start, out[0]!.end, out[0]!.conditional], ["card", 200, 230, true]);
});
