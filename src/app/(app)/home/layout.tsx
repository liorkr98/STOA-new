/** Home uses the full dispatch column — counteract the app shell's padded main. */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <div className="-mx-5 -my-8">{children}</div>;
}
