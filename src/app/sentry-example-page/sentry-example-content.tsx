"use client";

import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

export function SentryExampleContent() {
  return (
    <div className="mt-8 flex flex-col gap-4">
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          throw new Error("Sentry test error from /sentry-example-page");
        }}
      >
        Break the world
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          Sentry.captureMessage("Sentry test message from /sentry-example-page");
        }}
      >
        Send test message
      </Button>
    </div>
  );
}
