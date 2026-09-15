import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appUrl, originFromForwarded, requireAppUrl, sameOriginPath } from "./urls";

describe("sameOriginPath", () => {
  it("keeps an in-app path", () => {
    assert.equal(sameOriginPath("/feed", "/home"), "/feed");
    assert.equal(sameOriginPath("/home?tab=1", "/home"), "/home?tab=1");
  });

  it("rejects open redirects", () => {
    assert.equal(sameOriginPath("https://evil.example/phish", "/home"), "/home");
    assert.equal(sameOriginPath("//evil.example", "/home"), "/home");
    assert.equal(sameOriginPath("feed", "/home"), "/home");
    assert.equal(sameOriginPath("", "/home"), "/home");
    assert.equal(sameOriginPath(null, "/home"), "/home");
  });
});

describe("appUrl", () => {
  it("builds a same-origin absolute URL", () => {
    assert.equal(appUrl("https://www.stoamarket.ai", "/feed"), "https://www.stoamarket.ai/feed");
    assert.equal(
      appUrl("https://www.stoamarket.ai/", "/auth/callback?next=/home"),
      "https://www.stoamarket.ai/auth/callback?next=/home",
    );
  });

  it("refuses a path that would leave the host", () => {
    assert.throws(() => appUrl("https://www.stoamarket.ai", "https://evil.example/x"));
  });
});

describe("requireAppUrl", () => {
  it("accepts a URL already on this origin", () => {
    assert.equal(
      requireAppUrl("https://www.stoamarket.ai", "https://www.stoamarket.ai/settings/payouts"),
      "https://www.stoamarket.ai/settings/payouts",
    );
  });

  it("rejects a foreign return", () => {
    assert.throws(() =>
      requireAppUrl("https://www.stoamarket.ai", "https://evil.example/settings/payouts"),
    );
  });
});

describe("originFromForwarded", () => {
  it("prefers the forwarded host", () => {
    assert.equal(
      originFromForwarded("preview.stoamarket.ai", "https", "https://www.stoamarket.ai"),
      "https://preview.stoamarket.ai",
    );
  });

  it("uses http on localhost when proto is missing", () => {
    assert.equal(originFromForwarded("localhost:3000", null, "https://www.stoamarket.ai"), "http://localhost:3000");
  });

  it("takes the first forwarded host and proto", () => {
    assert.equal(
      originFromForwarded("preview.stoamarket.ai, localhost", "https, http", "https://www.stoamarket.ai"),
      "https://preview.stoamarket.ai",
    );
  });

  it("ignores a proto that is not http or https", () => {
    assert.equal(
      originFromForwarded("www.stoamarket.ai", "javascript", "https://fallback.example"),
      "https://www.stoamarket.ai",
    );
  });

  it("falls back when host is missing", () => {
    assert.equal(originFromForwarded(null, "https", "https://www.stoamarket.ai"), "https://www.stoamarket.ai");
  });
});
