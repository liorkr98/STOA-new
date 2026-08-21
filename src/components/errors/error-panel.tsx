"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/**
 * Shared body of every route error boundary.
 *
 * Deliberately presentational: each route group wraps it in its own `error.tsx`
 * so the boundary renders *inside* that group's layout and keeps the site chrome
 * (logo, nav, footer). A boundary that renders outside the layout leaves the
 * reader on a dead page with no way back into the product.
 *
 * The wording matches the nav: `/discover` is labelled "Feed" there, so it is
 * called Feed here too (docs/PRODUCT_MODEL.md, "The surfaces").
 */
export function ErrorPanel({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="t-h1">Something broke on our side</h1>
      <p className="t-body">
        The page hit an error while loading. Your data is fine. Try again, or head back to the
        Feed.
      </p>
      <div className="mt-2 flex gap-3">
        <button type="button" onClick={reset} className={buttonClass("primary", "md")}>
          Try again
        </button>
        <Link href="/discover" className={buttonClass("secondary", "md")}>
          Go to Feed
        </Link>
      </div>
    </div>
  );
}
