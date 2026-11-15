import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseVercelSpendBody,
  vercelSpendSignature,
  verifyVercelSpendSignature,
} from "./vercel-spend";

const SAMPLE = JSON.stringify({
  id: "2qn7PZrx89yxY34vEZPD3",
  type: "budget.reached",
  createdAt: 1759449600000,
  payload: {
    team: { id: "team_jkT8yZ3oE1u6xLo8h6dxfNc3" },
    budgetAmount: 1,
    currentSpend: 0.5,
    teamId: "team_jkT8yZ3oE1u6xLo8h6dxfNc3",
    thresholdPercent: 50,
    scope: "team",
  },
});

describe("Vercel spend webhook signature", () => {
  it("accepts the HMAC-SHA1 digest Vercel sends on x-vercel-signature", () => {
    const secret = "spend-webhook-secret";
    const header = vercelSpendSignature(SAMPLE, secret);
    assert.equal(verifyVercelSpendSignature(SAMPLE, header, secret), true);
  });

  it("accepts a stored secret that picked up a trailing newline", () => {
    const secret = "spend-webhook-secret";
    const header = vercelSpendSignature(SAMPLE, secret);
    assert.equal(verifyVercelSpendSignature(SAMPLE, ` ${header}\n`, `${secret}\n`), true);
  });

  it("rejects a different body or secret", () => {
    const secret = "spend-webhook-secret";
    const header = vercelSpendSignature(SAMPLE, secret);
    assert.equal(verifyVercelSpendSignature(`${SAMPLE} `, header, secret), false);
    assert.equal(verifyVercelSpendSignature(SAMPLE, header, "other-secret"), false);
    assert.equal(verifyVercelSpendSignature(SAMPLE, null, secret), false);
    assert.equal(verifyVercelSpendSignature(SAMPLE, header, null), false);
  });
});

describe("Vercel spend webhook payload", () => {
  it("reads budget.reached fields from the payload object", () => {
    const event = parseVercelSpendBody(SAMPLE);
    assert.ok(event);
    assert.equal(event.id, "2qn7PZrx89yxY34vEZPD3");
    assert.equal(event.type, "budget.reached");
    assert.equal(event.budgetAmount, 1);
    assert.equal(event.currentSpend, 0.5);
    assert.equal(event.thresholdPercent, 50);
    assert.equal(event.scope, "team");
    assert.equal(event.teamId, "team_jkT8yZ3oE1u6xLo8h6dxfNc3");
  });

  it("rejects non-budget events and invalid JSON", () => {
    assert.equal(parseVercelSpendBody("{"), null);
    assert.equal(parseVercelSpendBody(JSON.stringify({ type: "deployment.created" })), null);
  });
});
