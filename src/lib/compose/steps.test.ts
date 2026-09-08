import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stepsFor } from "./steps";

describe("stepsFor", () => {
  it("starts Video and Research on the clip, not the thesis", () => {
    const keys = stepsFor("video", false).map((s) => s.key);
    assert.deepEqual(keys, ["video", "write", "call", "cards", "tags", "publish"]);
  });

  it("adds Edit video once a clip is present", () => {
    const keys = stepsFor("research", true).map((s) => s.key);
    assert.equal(keys[0], "video");
    assert.ok(keys.includes("video_edit"));
  });

  it("keeps a Post as writing first", () => {
    const keys = stepsFor("short_post", false).map((s) => s.key);
    assert.deepEqual(keys, ["write", "call", "tags", "publish"]);
  });
});
