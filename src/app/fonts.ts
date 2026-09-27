import { Bricolage_Grotesque, Heebo, Inter, JetBrains_Mono } from "next/font/google";

/*
 * Bricolage Grotesque for display, Inter for reading and UI, JetBrains Mono
 * for tickers only. Heebo supplies Hebrew, which none of the three has.
 *
 * adjustFontFallback is off on the Latin faces on purpose. When it is on,
 * next/font appends a metric-matched copy of Arial to each family, and that
 * copy covers Hebrew, so every Hebrew character stopped there and rendered in
 * resized Arial before the stack ever reached Heebo. With it off the stack in
 * globals.css is exactly: Latin face, then Heebo, then the system.
 */

export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["500", "600", "700", "800"],
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
});

export const heebo = Heebo({
  subsets: ["hebrew"],
  variable: "--font-heebo",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["500", "600"],
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
});
