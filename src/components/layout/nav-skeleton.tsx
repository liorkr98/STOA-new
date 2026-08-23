/** Same height as TopNav so the page does not jump while chrome streams in. */
export function NavSkeleton() {
  return <div className="h-14 border-b border-border bg-paper" aria-hidden />;
}
