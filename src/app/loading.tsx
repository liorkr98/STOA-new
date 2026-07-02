/**
 * Route-level loading state: quiet skeleton bars, no spinner (docs/MOTION.md
 * A.3 -- skeletons crossfade, never pop). Applies to any route without its
 * own loading file.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-12" aria-busy>
      <div className="h-8 w-2/5 animate-pulse rounded-[var(--radius-btn)] bg-surface-2" />
      <div className="h-4 w-3/5 animate-pulse rounded-[var(--radius-btn)] bg-surface-2" />
      <div className="mt-4 h-40 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />
      <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
