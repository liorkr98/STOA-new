import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldBypassServiceWorker } from "./cache-policy";

describe("shouldBypassServiceWorker", () => {
  it("lets the app origin through", () => {
    assert.equal(shouldBypassServiceWorker({ pathname: "/feed", hostname: "www.stoamarket.ai" }), false);
    assert.equal(shouldBypassServiceWorker({ pathname: "/offline", hostname: "www.stoamarket.ai" }), false);
    assert.equal(
      shouldBypassServiceWorker({ pathname: "/_next/static/chunk.js", hostname: "www.stoamarket.ai" }),
      false,
    );
  });

  it("never caches HLS, mp4, or the demo clips", () => {
    assert.equal(
      shouldBypassServiceWorker({ pathname: "/8f3c/playlist.m3u8", hostname: "vz-abc.b-cdn.net" }),
      true,
    );
    assert.equal(shouldBypassServiceWorker({ pathname: "/clip.mp4", hostname: "www.stoamarket.ai" }), true);
    assert.equal(
      shouldBypassServiceWorker({ pathname: "/demo/clips/clip-01.mp4", hostname: "www.stoamarket.ai" }),
      true,
    );
    assert.equal(shouldBypassServiceWorker({ pathname: "/demo/clips/poster.jpg", hostname: "www.stoamarket.ai" }), true);
  });

  it("never intercepts Bunny hosts", () => {
    for (const hostname of ["vz-abc.b-cdn.net", "iframe.mediadelivery.net", "video.bunnycdn.com"]) {
      assert.equal(shouldBypassServiceWorker({ pathname: "/embed/x", hostname }), true, hostname);
    }
  });
});
