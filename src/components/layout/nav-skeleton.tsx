/** Same height as TopNav so the page does not jump while chrome streams in. */
export function NavSkeleton() {
  return (
    <div className="border-b border-border bg-paper pt-[var(--safe-top)]" aria-hidden>
      <div className="h-14" />
    </div>
  );
}
