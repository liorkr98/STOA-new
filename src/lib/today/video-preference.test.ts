import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VIDEO_WEIGHT, preferVideo } from "./video-preference";

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
