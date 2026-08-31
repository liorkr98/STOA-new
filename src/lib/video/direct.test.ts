import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDirectVideoUrl, isHlsUrl, isPlayableVideoUrl } from "./direct";

/**
 * These predicates decide whether a clip plays at all.
 *
 * The bug they exist to prevent: `isDirectVideoUrl` alone did not recognize an
 * HLS manifest, so every real Bunny row looked unplayable and was silently
 * swapped for a multi-megabyte demo file with no bitrate ladder. Anything that
 * narrows `isPlayableVideoUrl` again reintroduces that.
 */

const HLS = "https://vz-abc123.b-cdn.net/8f3c/playlist.m3u8";

describe("video url classification", () => {
  it("treats a Bunny HLS manifest as playable but not as a direct file", () => {
    assert.equal(isHlsUrl(HLS), true);
    assert.equal(isDirectVideoUrl(HLS), false);
    assert.equal(isPlayableVideoUrl(HLS), true);
  });

  it("treats stored files as direct and playable", () => {
    for (const url of [
      "https://example.com/clip.mp4",
      "https://example.com/clip.webm",
      "https://example.com/clip.ogg",
      "/demo/clips/clip-01.mp4?v=3",
    ]) {
      assert.equal(isDirectVideoUrl(url), true, url);
      assert.equal(isPlayableVideoUrl(url), true, url);
      assert.equal(isHlsUrl(url), false, url);
    }
  });

  it("survives query strings and fragments on either kind", () => {
    assert.equal(isHlsUrl(`${HLS}?token=abc`), true);
    assert.equal(isHlsUrl("https://cdn.example/x/playlist.m3u8#t=2"), true);
    assert.equal(isDirectVideoUrl("https://example.com/clip.mp4?v=2"), true);
  });

  it("rejects an embed page, which needs the provider iframe instead", () => {
    const embed = "https://iframe.mediadelivery.net/embed/1234/8f3c?autoplay=true";
    assert.equal(isPlayableVideoUrl(embed), false);
    assert.equal(isHlsUrl(embed), false);
  });

  it("rejects empty and missing values rather than throwing", () => {
    for (const url of [null, undefined, ""]) {
      assert.equal(isPlayableVideoUrl(url), false);
      assert.equal(isHlsUrl(url), false);
      assert.equal(isDirectVideoUrl(url), false);
    }
  });

  it("does not match an extension that merely appears mid-path", () => {
    assert.equal(isHlsUrl("https://example.com/playlist.m3u8.txt"), false);
    assert.equal(isDirectVideoUrl("https://example.com/mp4/notes.pdf"), false);
  });
});
