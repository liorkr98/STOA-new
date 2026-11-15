import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isFreshAuthUser, isInviteAllowlistedPath, isMachinePath } from "./gate";
import { hashInviteToken, looksLikeInviteToken, newInviteToken } from "./tokens";

describe("invite allowlist", () => {
  it("lets the closed door and auth paths through", () => {
    assert.equal(isInviteAllowlistedPath("/"), true);
    assert.equal(isInviteAllowlistedPath("/sign-in"), true);
    assert.equal(isInviteAllowlistedPath("/sign-up"), true);
    assert.equal(isInviteAllowlistedPath("/join/abc"), true);
    assert.equal(isInviteAllowlistedPath("/auth/callback"), true);
    assert.equal(isInviteAllowlistedPath("/privacy"), true);
    assert.equal(isInviteAllowlistedPath("/compliance-brief"), true);
    assert.equal(isInviteAllowlistedPath("/terms/creators"), true);
    assert.equal(isInviteAllowlistedPath("/forgot-password"), true);
  });

  it("blocks product surfaces", () => {
    assert.equal(isInviteAllowlistedPath("/feed"), false);
    assert.equal(isInviteAllowlistedPath("/home"), false);
    assert.equal(isInviteAllowlistedPath("/explore"), false);
    assert.equal(isInviteAllowlistedPath("/markets"), false);
    assert.equal(isInviteAllowlistedPath("/about"), false);
    assert.equal(isInviteAllowlistedPath("/pricing"), false);
  });

  it("does not treat / as a prefix of every path", () => {
    assert.equal(isInviteAllowlistedPath("/feed"), false);
  });
});

describe("machine paths", () => {
  it("keeps cron, jobs, and webhooks off the invite gate", () => {
    assert.equal(isMachinePath("/api/cron/grade"), true);
    assert.equal(isMachinePath("/api/jobs/notify"), true);
    assert.equal(isMachinePath("/api/internal/slack-bug-reply"), true);
    assert.equal(isMachinePath("/api/webhooks/paypal"), true);
    assert.equal(isMachinePath("/api/search"), false);
    assert.equal(isMachinePath("/api/market/quote"), false);
  });
});

describe("fresh auth users", () => {
  it("treats a just-created account as new", () => {
    assert.equal(isFreshAuthUser(new Date().toISOString()), true);
    assert.equal(isFreshAuthUser(new Date(Date.now() - 11 * 60 * 1000).toISOString()), false);
    assert.equal(isFreshAuthUser(undefined), true);
  });
});

describe("invite tokens", () => {
  it("hashes stably and mints URL-safe tokens", () => {
    const minted = newInviteToken();
    assert.equal(looksLikeInviteToken(minted.token), true);
    assert.equal(hashInviteToken(minted.token), minted.tokenHash);
    assert.equal(minted.tokenPrefix, minted.token.slice(0, 8));
    assert.notEqual(hashInviteToken(minted.token), hashInviteToken(`${minted.token}x`));
  });

  it("rejects short or punctuated stand-ins", () => {
    assert.equal(looksLikeInviteToken("abc"), false);
    assert.equal(looksLikeInviteToken("not a token!!!!"), false);
  });
});
