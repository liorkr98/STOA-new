/**
 * Today pulls up tight under the nav (the masthead is the page's own top
 * rule), but keeps the shell's side gutter: its width comes from the wide
 * tier on the page itself, not from breaking out of the layout.
 *
 * Only the top padding is cancelled, and by the token rather than a fixed 8,
 * which was over-cancelling on a phone. Cancelling the bottom too ate the
 * clearance the floating tab bar needs, and the last line sat under it.
 */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <div className="mt-[calc(-1*var(--main-pad-y))]">{children}</div>;
}
