"use client";

import { useLinkStatus } from "next/link";

/** Hairline under a nav link while that destination is still loading. */
export function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="absolute inset-x-3 -bottom-px h-[1.5px] animate-pulse bg-[var(--ink)]/50"
    />
  );
}
