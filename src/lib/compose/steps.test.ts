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
  symbol: "idle",
  cards: [],
  hasVideo: false,
  wordlessOverlays: 0,
  blankVisuals: 0,
  primaryTag: null,
};

describe("spineFor", () => {
  it("is the content, carrying the headline, then the tags, on every type", () => {
    assert.deepEqual(spineFor("video").map((s) => s.key), ["video", "tags"]);
    assert.deepEqual(spineFor("brief").map((s) => s.key), ["brief", "tags"]);
    assert.deepEqual(spineFor("thesis").map((s) => s.key), ["thesis", "tags"]);
  });
});

describe("featuresFor", () => {
  it("offers each type what it may add, as a menu and never as steps", () => {
    assert.deepEqual(featuresFor("video").map((f) => f.key), ["stance", "cards", "thesis"]);
    assert.deepEqual(featuresFor("brief").map((f) => f.key), ["stance", "cards"]);
    assert.deepEqual(featuresFor("thesis").map((f) => f.key), ["stance", "cards"]);
  });

  it("knows the stance is a feature on every type, and a thesis is a video's feature", () => {
    assert.equal(roleOf("video", "stance"), "feature");
    assert.equal(roleOf("thesis", "stance"), "feature");
    assert.equal(roleOf("video", "thesis"), "feature");
    assert.equal(roleOf("thesis", "thesis"), "spine");
  });
});

describe("advanceFor on the spine", () => {
  it("asks each content screen for its headline once the content is in", () => {
    assert.match(advanceFor("video", "video", { ...empty, hasVideo: true }).blocker ?? "", /headline under the video/);
    assert.equal(advanceFor("video", "video", { ...empty, hasVideo: true, title: "A line" }).blocker, null);
    assert.match(advanceFor("brief", "brief", { ...empty, briefText: "A take." }).blocker ?? "", /headline above the take/);
    assert.match(advanceFor("thesis", "thesis", { ...empty, bodyText: "Words." }).blocker ?? "", /headline above the report/);
  });

  it("refuses an empty content step and names it", () => {
    assert.match(advanceFor("video", "video", empty).blocker ?? "", /Add a video/);
    assert.match(advanceFor("brief", "brief", empty).blocker ?? "", /Write the take/);
    assert.match(advanceFor("thesis", "thesis", empty).blocker ?? "", /Write the report/);
  });

  it("reads Continue and passes once the step is done", () => {
    assert.deepEqual(advanceFor("brief", "brief", { ...empty, briefText: "A take.", title: "A line" }), {
      label: "Continue",
      blocker: null,
    });
    assert.deepEqual(advanceFor("thesis", "tags", { ...empty, primaryTag: "semis" }), {
      label: "Continue",
      blocker: null,
    });
  });

  it("caps a brief", () => {
    const long = "x".repeat(301);
    assert.match(advanceFor("brief", "brief", { ...empty, briefText: long }).blocker ?? "", /300 characters/);
  });
});

describe("advanceFor in a feature editor", () => {
  it("reads Skip when nothing was added", () => {
    assert.deepEqual(advanceFor("video", "stance", empty), { label: "Skip", blocker: null });
    assert.deepEqual(advanceFor("video", "cards", empty), { label: "Skip", blocker: null });
    assert.deepEqual(advanceFor("video", "thesis", empty), { label: "Skip", blocker: null });
  });

  it("reads Done and refuses a half-entered stance", () => {
    const r = advanceFor("video", "stance", { ...empty, ticker: "NVDA", symbol: "found" });
    assert.equal(r.label, "Done");
    assert.match(r.blocker ?? "", /Choose long, short or hold for NVDA/);
    assert.match(
      advanceFor("brief", "stance", { ...empty, direction: "long" }).blocker ?? "",
      /direction needs a ticker/,
    );
    assert.match(
      advanceFor("brief", "stance", { ...empty, ticker: "ZZZZ", symbol: "missing", direction: "long" }).blocker ?? "",
      /ZZZZ was not found/,
    );
  });

  it("takes any direction on any name, hold and macro instruments included", () => {
    const r = advanceFor("brief", "stance", { ...empty, ticker: "XAUUSD", symbol: "found", direction: "hold" });
    assert.deepEqual(r, { label: "Done", blocker: null });
  });

  it("never asks a live publication's stance for anything", () => {
    assert.equal(advanceFor("thesis", "stance", { ...empty, ticker: "NVDA", symbol: "frozen" }).blocker, null);
  });

  it("refuses a blank card by name", () => {
    const r = advanceFor("thesis", "cards", { ...empty, cards: [{ name: "Thesis", empty: true }] });
    assert.match(r.blocker ?? "", /Thesis card has nothing on it/);
  });
});
