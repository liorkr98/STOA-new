import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { advanceFor, featuresFor, roleOf, spineFor, type AdvanceInput } from "./steps";

const empty: AdvanceInput = {
  title: "",
  briefText: "",
  briefMaxChars: 300,
  bodyText: "",
  ticker: "",
  direction: null,
  target: "",
  horizon: 45,
  symbol: "idle",
  eligibility: null,
  cards: [],
  hasVideo: false,
  wordlessOverlays: 0,
  blankVisuals: 0,
  primaryTag: null,
};

describe("spineFor", () => {
  it("is always three steps: the content, the headline, the tags", () => {
    assert.deepEqual(spineFor("video").map((s) => s.key), ["video", "headline", "tags"]);
    assert.deepEqual(spineFor("brief").map((s) => s.key), ["brief", "headline", "tags"]);
    assert.deepEqual(spineFor("thesis").map((s) => s.key), ["thesis", "headline", "tags"]);
    assert.deepEqual(spineFor("verdict").map((s) => s.key), ["call", "headline", "tags"]);
  });
});

describe("featuresFor", () => {
  it("offers each type what it may add, as a menu and never as steps", () => {
    assert.deepEqual(featuresFor("video").map((f) => f.key), ["call", "cards", "thesis"]);
    assert.deepEqual(featuresFor("brief").map((f) => f.key), ["call", "cards"]);
    assert.deepEqual(featuresFor("thesis").map((f) => f.key), ["call", "cards"]);
    assert.deepEqual(featuresFor("verdict").map((f) => f.key), ["cards", "video", "thesis"]);
  });

  it("knows a call is the verdict's spine and a video's feature", () => {
    assert.equal(roleOf("verdict", "call"), "spine");
    assert.equal(roleOf("video", "call"), "feature");
    assert.equal(roleOf("verdict", "video"), "feature");
  });
});

describe("advanceFor on the spine", () => {
  it("refuses an empty content step and names it", () => {
    assert.match(advanceFor("video", "video", empty).blocker ?? "", /Add a video/);
    assert.match(advanceFor("brief", "brief", empty).blocker ?? "", /Write the take/);
    assert.match(advanceFor("thesis", "thesis", empty).blocker ?? "", /Write the report/);
    assert.match(advanceFor("verdict", "call", empty).blocker ?? "", /starts with a ticker/);
  });

  it("reads Continue and passes once the step is done", () => {
    assert.deepEqual(advanceFor("brief", "brief", { ...empty, briefText: "A take." }), {
      label: "Continue",
      blocker: null,
    });
    assert.deepEqual(advanceFor("thesis", "headline", { ...empty, title: "A line" }), {
      label: "Continue",
      blocker: null,
    });
  });

  it("caps a brief", () => {
    const long = "x".repeat(301);
    assert.match(advanceFor("brief", "brief", { ...empty, briefText: long }).blocker ?? "", /300 characters/);
  });
});

describe("advanceFor on the verdict's call", () => {
  const found = { ...empty, ticker: "AXTI", symbol: "found" as const };

  it("walks the creator through the call in order", () => {
    assert.match(advanceFor("verdict", "call", found).blocker ?? "", /needs a direction/);
    assert.match(
      advanceFor("verdict", "call", { ...found, direction: "long" }).blocker ?? "",
      /needs a target price/,
    );
    assert.match(
      advanceFor("verdict", "call", { ...found, direction: "hold", target: "34" }).blocker ?? "",
      /long or short/,
    );
    assert.match(
      advanceFor("verdict", "call", { ...found, direction: "long", target: "34", horizon: 200 }).blocker ?? "",
      /between 7 and 180 days/,
    );
    assert.equal(
      advanceFor("verdict", "call", { ...found, direction: "long", target: "34", horizon: 45 }).blocker,
      null,
    );
  });

  it("carries the eligibility reason as the blocker", () => {
    const r = advanceFor("verdict", "call", {
      ...found,
      direction: "long",
      target: "34",
      eligibility: { ok: false, kind: "too_large", reason: "NVDA is a $3.2T company." },
    });
    assert.equal(r.blocker, "NVDA is a $3.2T company.");
  });
});

describe("advanceFor in a feature editor", () => {
  it("reads Skip when nothing was added", () => {
    assert.deepEqual(advanceFor("video", "call", empty), { label: "Skip", blocker: null });
    assert.deepEqual(advanceFor("video", "cards", empty), { label: "Skip", blocker: null });
    assert.deepEqual(advanceFor("verdict", "video", empty), { label: "Skip", blocker: null });
  });

  it("reads Done and refuses a half-entered call", () => {
    const r = advanceFor("video", "call", { ...empty, ticker: "NVDA", symbol: "found" });
    assert.equal(r.label, "Done");
    assert.match(r.blocker ?? "", /needs a direction/);
  });

  it("lets a plain call keep hold and a macro name, which a verdict cannot", () => {
    const r = advanceFor("brief", "call", {
      ...empty,
      ticker: "XAUUSD",
      symbol: "found",
      direction: "hold",
      eligibility: { ok: false, kind: "macro", reason: "no" },
    });
    assert.deepEqual(r, { label: "Done", blocker: null });
  });

  it("refuses a blank card by name", () => {
    const r = advanceFor("thesis", "cards", { ...empty, cards: [{ name: "Thesis", empty: true }] });
    assert.match(r.blocker ?? "", /Thesis card has nothing on it/);
  });
});
