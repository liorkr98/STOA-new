"use client";

import { ErrorPanel } from "@/components/errors/error-panel";

/**
 * Lives inside the route group so the group layout (top nav, logo, footer)
 * still renders around the error. Without it the boundary falls through to
 * src/app/error.tsx, which sits outside every layout.
 */
export default function GroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPanel error={error} reset={reset} />;
}
