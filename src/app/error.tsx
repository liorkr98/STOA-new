"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/**
 * Route error boundary. Never shows a raw error string to the reader; always
 * offers a way forward (docs/MOTION.md C.2 items 3 and 12).
 */
export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="t-h1">Something broke on our side</h1>
      <p className="t-body">
        The page hit an error while loading. Your data is fine. Try again, or head back to the
        feed.
      </p>
      <div className="mt-2 flex gap-3">
        <button type="button" onClick={reset} className={buttonClass("primary", "md")}>
          Try again
        </button>
        <Link href="/discover" className={buttonClass("secondary", "md")}>
          Go to Discover
        </Link>
      </div>
    </div>
  );
}
