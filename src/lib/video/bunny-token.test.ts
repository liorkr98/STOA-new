import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyBunnyToken, signBunnyToken } from "./bunny-token";

describe("Bunny CDN token", () => {
  it("is stable for a known path, expiry, and key", () => {
    const token = signBunnyToken("/abc/playlist.m3u8", 1_700_000_000, "test-key");
    assert.match(token, /^[A-Za-z0-9_-]+$/);
    assert.equal(signBunnyToken("/abc/playlist.m3u8", 1_700_000_000, "test-key"), token);
    assert.notEqual(signBunnyToken("/abc/playlist.m3u8", 1_700_000_001, "test-key"), token);
  });

  it("leaves URLs unsigned when no key is set", () => {
    const url = "https://vz-example.b-cdn.net/guid/playlist.m3u8";
    assert.equal(applyBunnyToken(url, ""), url);
    assert.equal(applyBunnyToken(url, undefined), url);
  });

  it("appends token and expires when a key is present", () => {
    const signed = applyBunnyToken("https://vz-example.b-cdn.net/guid/playlist.m3u8", "test-key");
    const parsed = new URL(signed);
    assert.ok(parsed.searchParams.get("token"));
    assert.ok(parsed.searchParams.get("expires"));
  });
});
