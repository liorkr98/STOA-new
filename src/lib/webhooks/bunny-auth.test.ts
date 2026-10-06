import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkBunnyWebhookSecret } from "./bunny-auth";

function req(url: string, header?: string | null) {
  return {
    url,
    headers: {
      get(name: string) {
        if (name.toLowerCase() === "x-stoa-webhook-secret") return header ?? null;
        return null;
      },
    },
  };
}

describe("Bunny webhook secret", () => {
  it("rejects when no secret is configured", () => {
    const result = checkBunnyWebhookSecret(req("https://stoa.app/api/webhooks/bunny-stream"), "");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 503);
      assert.equal(result.reason, "secret not configured");
    }
  });

  it("accepts a matching query secret", () => {
    const result = checkBunnyWebhookSecret(
      req("https://stoa.app/api/webhooks/bunny-stream?secret=s3cret-value"),
      "s3cret-value",
    );
    assert.equal(result.ok, true);
  });

  it("accepts a matching header when the query is hostile", () => {
    const result = checkBunnyWebhookSecret(
      req("https://stoa.app/api/webhooks/bunny-stream", "s3cret-value"),
      "s3cret-value",
    );
    assert.equal(result.ok, true);
  });

  it("rejects a mismatch", () => {
    const result = checkBunnyWebhookSecret(
      req("https://stoa.app/api/webhooks/bunny-stream?secret=wrong"),
      "s3cret-value",
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 401);
  });
});
