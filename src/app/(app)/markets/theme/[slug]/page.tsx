import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionUserId } from "@/lib/db/auth";
import { buildTheme, findTheme } from "@/lib/markets/build-theme";
import { ThemeAnalysts, ThemeHeader, ThemeNames, ThemePublications } from "@/components/markets/theme-sections";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const theme = findTheme(slug);
  if (!theme) return { title: "Theme" };
  return {
    title: `${theme.name} · Theme`,
    description: theme.deck,
    alternates: { canonical: `/markets/theme/${theme.slug}` },
  };
}

/** A theme is an editorial lens on the market: its names, the publications about them, who covers it. */
export default async function ThemePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const theme = findTheme(slug);
  if (!theme) notFound();

  const userId = await getSessionUserId();
  const payload = await buildTheme(theme, userId);

  return (
    <article className="markets-page mx-auto w-full max-w-[var(--w-wide)] py-10 sm:py-14">
      <ThemeHeader payload={payload} />
      <ThemeNames payload={payload} />
      <ThemePublications payload={payload} />
      <ThemeAnalysts payload={payload} isAuthed={Boolean(userId)} />
    </article>
  );
}
