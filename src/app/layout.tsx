import type { Metadata, Viewport } from "next";
import { bricolage, heebo, inter, jetbrainsMono } from "./fonts";
import { Providers } from "./providers";
import { SITE_URL } from "@/lib/seo/site";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The browser bar cannot read CSS variables. These are --paper light and dark.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1216" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Stoa - Think clearly. Invest better.",
    template: "%s · Stoa",
  },
  description:
    "A marketplace for independent stock research.",
  appleWebApp: {
    capable: true,
    title: "Stoa",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
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
      className={`${inter.variable} ${heebo.variable} ${bricolage.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
