import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeSecret, secretsMatch } from "./secret";

/**
 * The failure this guards against: a webhook secret pasted into a hosting
 * dashboard picks up a trailing newline, every delivery is rejected with 401,
 * nothing is logged, and the symptom shows up weeks later as "clips never go
 * live". The same bug was already fixed once for CRON_SECRET.
 */

describe("webhook shared secret", () => {
  it("accepts a stored value that picked up a trailing newline", () => {
    const stored = normalizeSecret("s3cret-value\n");
    assert.equal(stored, "s3cret-value");
    assert.equal(secretsMatch(stored!, normalizeSecret("s3cret-value")), true);
  });

  it("accepts surrounding whitespace on either side", () => {
    const stored = normalizeSecret("  s3cret-value  ");
    assert.equal(secretsMatch(stored!, normalizeSecret("s3cret-value\r\n")), true);
  });

  it("still rejects a genuinely different secret", () => {
    const stored = normalizeSecret("s3cret-value")!;
    assert.equal(secretsMatch(stored, normalizeSecret("wrong-value")), false);
    assert.equal(secretsMatch(stored, normalizeSecret("s3cret-valu")), false);
    assert.equal(secretsMatch(stored, normalizeSecret("s3cret-value-extra")), false);
  });

  it("treats missing and blank as no secret at all", () => {
    for (const raw of [null, undefined, "", "   ", "\n"]) {
      assert.equal(normalizeSecret(raw), null, JSON.stringify(raw));
    }
    assert.equal(secretsMatch("s3cret", null), false);
  });

  it("does not silently accept a value the query string mangled", () => {
    // "a+b" in a URL arrives as "a b"; that is a real mismatch, not whitespace
    // to be trimmed, so it must still fail rather than appear to work.
    const stored = normalizeSecret("a+b+c")!;
    assert.equal(secretsMatch(stored, normalizeSecret("a b c")), false);
  });
});
