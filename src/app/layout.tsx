import type { Metadata, Viewport } from "next";
import { fraunces, plexSans, plexHebrew, plexMono } from "./fonts";
import { Providers } from "./providers";
import { SITE_URL } from "@/lib/seo/site";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF8F4",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Stoa - Think clearly. Invest better.",
    template: "%s · Stoa",
  },
  description:
    "A marketplace for independent stock research with a verified, public track record on every call.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables must live on <html>: the --font-display/sans/mono tokens
    // are declared in :root and reference these next/font variables, so if the
    // variables sit on <body> they are invisible at :root scope and every
    // font token computes invalid (silent system-font fallback site-wide).
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexHebrew.variable} ${fraunces.variable} ${plexMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
