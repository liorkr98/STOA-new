/**
 * Today pulls up tight under the nav (the masthead is the page's own top
 * rule), but keeps the shell's side gutter: its width comes from the wide
 * tier on the page itself, not from breaking out of the layout.
 */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <div className="-my-8">{children}</div>;
}
