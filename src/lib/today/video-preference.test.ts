import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_VIDEO_SHARE, VIDEO_WEIGHT, fillBand, preferVideo, videoAllowance } from "./video-preference";

/** V is a publication with a ready clip, W a written one. */
const V = { video: true };
const W = { video: false };
const hasVideo = (x: { video: boolean }) => x.video;
const shape = (band: { video: boolean }[]) => band.map((x) => (x.video ? "V" : "W")).join("");
const repeat = (item: { video: boolean }, n: number) => Array.from({ length: n }, () => item);

describe("preferVideo", () => {
  it("leaves a written publication's own score alone", () => {
    assert.equal(preferVideo(10, false), 10);
  });

  it("is a lean and not an override: a clearly stronger written report still wins", () => {
    assert.ok(preferVideo(10, true) < 20);
    assert.ok(preferVideo(10, true) > 10);
  });

  it("settles a near-tie towards the publication with a clip", () => {
    assert.ok(preferVideo(10, true) > preferVideo(12, false));
    assert.equal(preferVideo(10, true), 10 * VIDEO_WEIGHT);
  });
});

describe("fillBand", () => {
  it("holds the share at every depth, not just at the bottom", () => {
    const band = fillBand([...repeat(V, 20), ...repeat(W, 20)], 16, hasVideo);
    assert.equal(band.length, 16);
    for (let n = 1; n <= band.length; n += 1) {
      const videos = band.slice(0, n).filter(hasVideo).length;
      assert.ok(videos <= videoAllowance(n), `prefix of ${n} held ${videos} videos`);
    }
  });

  it("keeps written work in the part of a band a phone actually shows", () => {
    // Trending Now collapses to five on a phone, so the first five matter on
    // their own: an all-video pool must still not produce an all-video screen.
    const band = fillBand(repeat(V, 40), 16, hasVideo);
    assert.ok(band.length === 16);
    const firstFive = fillBand([...repeat(V, 20), ...repeat(W, 20)], 16, hasVideo).slice(0, 5);
    assert.ok(firstFive.some((x) => !hasVideo(x)), `first five were ${shape(firstFive)}`);
  });

  it("never leaves a hole: a band with only video available is still full", () => {
    const band = fillBand(repeat(V, 40), 16, hasVideo);
    assert.equal(band.length, 16);
    assert.equal(band.filter(hasVideo).length, 16);
  });

  it("never leaves a hole: a band with only written work available is still full", () => {
    const band = fillBand(repeat(W, 40), 16, hasVideo);
    assert.equal(band.length, 16);
  });

  it("lets a band open with video", () => {
    const band = fillBand([...repeat(V, 10), ...repeat(W, 10)], 3, hasVideo);
    assert.ok(hasVideo(band[0]));
  });

  it("caps a three-slot band at two clips", () => {
    const band = fillBand([...repeat(V, 10), ...repeat(W, 10)], 3, hasVideo);
    assert.equal(band.filter(hasVideo).length, 2);
    assert.equal(shape(band), "VWV");
  });

  it("preserves the ranked order of what it does take", () => {
    const ranked = [{ id: 1, video: false }, { id: 2, video: true }, { id: 3, video: false }];
    const band = fillBand(ranked, 3, hasVideo);
    assert.deepEqual(band.map((x) => x.id), [1, 2, 3]);
  });

  it("holds the overall share too", () => {
    const band = fillBand([...repeat(V, 40), ...repeat(W, 40)], 20, hasVideo);
    assert.ok(band.filter(hasVideo).length <= Math.ceil(20 * MAX_VIDEO_SHARE));
  });

  it("returns nothing for a zero-slot band", () => {
    assert.deepEqual(fillBand(repeat(V, 5), 0, hasVideo), []);
  });
});
