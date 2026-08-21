import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionUserId } from "@/lib/db/auth";
import { buildSector, canonicalSector } from "@/lib/markets/build-sector";
import {
  SectorHeader,
  SectorNames,
  SectorPublications,
  SectorCoverage,
  SectorAnalysts,
} from "@/components/markets/sector-sections";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sector: string }>;
}): Promise<Metadata> {
  const { sector } = await params;
  const name = canonicalSector(decodeURIComponent(sector));
  if (!name) return { title: "Sector" };
  return {
    title: `${name} · Sector`,
    description: `Analyst coverage, open calls, and verified track records across ${name} on Stoa.`,
    alternates: { canonical: `/markets/sector/${encodeURIComponent(name)}` },
  };
}

/**
 * A sector is a first-class destination: taggable, followable, and the only
 * surface where commentary carrying no ticker can be found by subject.
 */
export default async function SectorPage({
  params,
}: {
  params: Promise<{ sector: string }>;
}) {
  const { sector } = await params;
  const name = canonicalSector(decodeURIComponent(sector));
  if (!name) notFound();

  const userId = await getSessionUserId();
  const payload = await buildSector(name, userId);

  return (
    <article className="markets-page mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <SectorHeader payload={payload} />
      <SectorNames names={payload.names} />
      <SectorCoverage payload={payload} />
      <SectorPublications items={payload.publications} />
      <SectorAnalysts analysts={payload.analysts} isAuthed={Boolean(userId)} />
    </article>
  );
}
