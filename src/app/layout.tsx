import type { Metadata } from "next";
import { fraunces, plexSans, plexMono } from "./fonts";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${plexSans.variable} ${fraunces.variable} ${plexMono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
