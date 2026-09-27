"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/button";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-bg text-text">
        <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center gap-4 px-5 text-center">
          <h1 className="t-title">Something went wrong</h1>
          <p className="t-body text-text-mute">
            An unexpected error occurred. Try refreshing the page. If it keeps happening, contact
            support.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={buttonClass("ghost", "md")}
          >
            Refresh
          </button>
        </main>
      </body>
    </html>
  );
}
