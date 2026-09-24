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
    assert.equal(spineProgress({ hasContent: true, hasTitle: false, hasTags: true }).resumeAt, 0);
    assert.equal(spineProgress({ hasContent: true, hasTitle: true, hasTags: false }).resumeAt, 1);
    assert.equal(spineProgress({ hasContent: true, hasTitle: true, hasTags: true }).resumeAt, 2);
  });

  it("counts the headline inside the first step, so the spine is two", () => {
    assert.deepEqual(spineProgress({ hasContent: true, hasTitle: false, hasTags: true }), { done: 1, total: 2, resumeAt: 0 });
    assert.deepEqual(spineProgress({ hasContent: true, hasTitle: true, hasTags: false }), { done: 1, total: 2, resumeAt: 1 });
    assert.deepEqual(spineProgress({ hasContent: true, hasTitle: true, hasTags: true }), { done: 2, total: 2, resumeAt: 2 });
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

  it("reopens a verdict at its call, since the target and horizon stay in the tab", () => {
    assert.equal(draftFacts({ ...base, type: "call", ticker: "PLAB" }).hasContent, false);
    assert.equal(draftFacts({ ...base, type: "call", ticker: "PLAB", stance: "long" }).hasContent, false);
  });
});

describe("summarizeDraft", () => {
  it("says where the draft is and how far along", () => {
    const s = summarizeDraft({
      ...base,
      type: "call",
      ticker: "PLAB",
      title: "Photronics guided flat and the mix says otherwise",
      stance: "short",
    });
    assert.equal(s.typeLabel, "VERDICT");
    assert.equal(s.done, 0);
    assert.equal(s.percent, 0);
    assert.equal(s.where, "Spine 1 of 2 · Call half entered");
    assert.equal(s.touchedAt, "2026-09-09T00:00:00Z");
  });

  it("places a video draft on a two-step spine", () => {
    const s = summarizeDraft({ ...base, type: "video", title: "A line", primary_tag: "semis" });
    assert.equal(s.where, "Spine 1 of 2 · Needs the clip again");
    assert.equal(s.total, 2);
  });

  it("names an untitled draft by its type", () => {
    const s = summarizeDraft({ ...base, type: "short_post" });
    assert.equal(s.title, "Untitled brief");
    assert.equal(s.untitled, true);
  });
});
