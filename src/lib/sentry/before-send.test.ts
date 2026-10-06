import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scrubPiiText, sentryBeforeSend, shouldDropSentryEvent } from "./before-send";
import type { ErrorEvent } from "@sentry/nextjs";

describe("Sentry PII scrub", () => {
  it("strips emails and auth cookies from text", () => {
    assert.equal(
      scrubPiiText("user investor@stoa.demo cookie sb-abc-auth-token=secret"),
      "user [email] cookie [auth-cookie]",
    );
  });

  it("still drops admin integration tests", () => {
    assert.equal(
      shouldDropSentryEvent({ message: "Stoa admin Sentry error test from /admin/integrations" } as ErrorEvent),
      true,
    );
  });

  it("redacts user email on events that ship", () => {
    const event = sentryBeforeSend(
      {
        message: "failed for investor@stoa.demo",
        user: { email: "investor@stoa.demo", ip_address: "1.2.3.4" },
      } as ErrorEvent,
      {},
    );
    assert.ok(event);
    assert.equal(event!.message, "failed for [email]");
    assert.equal(event!.user?.email, "[email]");
    assert.equal(event!.user?.ip_address, "[redacted]");
  });
});
