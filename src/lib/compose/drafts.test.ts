import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { draftFacts, spineProgress, summarizeDraft, type DraftRow } from "./drafts";

const base: DraftRow = {
  id: "d1",
  type: "research",
  title: null,
  summary: null,
  body: null,
  ticker: null,
  primary_tag: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-09T00:00:00Z",
};

describe("spineProgress", () => {
  it("resumes at the first unfinished step", () => {
    assert.equal(spineProgress({ hasContent: false, hasTitle: true, hasTags: true }).resumeAt, 0);
    assert.equal(spineProgress({ hasContent: true, hasTitle: false, hasTags: true }).resumeAt, 1);
    assert.equal(spineProgress({ hasContent: true, hasTitle: true, hasTags: false }).resumeAt, 2);
    assert.equal(spineProgress({ hasContent: true, hasTitle: true, hasTags: true }).resumeAt, 3);
  });
});

describe("draftFacts", () => {
  it("counts a thesis as started only once it has words", () => {
    assert.equal(draftFacts({ ...base, body: '{"type":"doc","content":[{"type":"paragraph"}]}' }).hasContent, false);
    assert.equal(
      draftFacts({
        ...base,
        body: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}',
      }).hasContent,
      true,
    );
  });

  it("reads a brief from its text", () => {
    assert.equal(draftFacts({ ...base, type: "short_post", summary: "A take." }).hasContent, true);
  });

  it("never counts a video draft's clip, which is not kept between sessions", () => {
    assert.equal(draftFacts({ ...base, type: "video", title: "Why the qualification matters" }).hasContent, false);
  });

  it("needs the whole call for a verdict, not just the ticker", () => {
    assert.equal(draftFacts({ ...base, type: "call", ticker: "PLAB" }).hasContent, false);
    assert.equal(
      draftFacts({
        ...base,
        type: "call",
        ticker: "PLAB",
        draft_direction: "long",
        draft_target_price: 34,
        draft_horizon_days: 45,
      }).hasContent,
      true,
    );
  });
});

describe("summarizeDraft", () => {
  it("says where the draft is and how far along", () => {
    const s = summarizeDraft({
      ...base,
      type: "call",
      ticker: "PLAB",
      title: "Photronics guided flat and the mix says otherwise",
      draft_direction: "short",
      draft_target_price: 20,
      draft_horizon_days: 30,
    });
    assert.equal(s.typeLabel, "VERDICT");
    assert.equal(s.done, 2);
    assert.equal(s.percent, 67);
    assert.equal(s.where, "Spine 3 of 3 · No tags");
    assert.equal(s.touchedAt, "2026-09-09T00:00:00Z");
  });

  it("names an untitled draft by its type", () => {
    const s = summarizeDraft({ ...base, type: "short_post" });
    assert.equal(s.title, "Untitled brief");
    assert.equal(s.untitled, true);
  });
});
