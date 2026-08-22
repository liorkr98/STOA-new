import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByHandle } from "@/lib/db/profiles";
import { buildProfileView } from "@/lib/profile/build-profile-view";
import { AnalystProfileView } from "@/components/profile/analyst-profile-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) return { title: "Analyst" };

  const title = `${profile.display_name} (@${profile.handle})`;
  const description =
    profile.headline || profile.bio?.slice(0, 160) || `Independent analyst on Stoa · @${profile.handle}`;
  const image = profile.cover_url || profile.avatar_url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(image ? { images: [{ url: image, alt: profile.display_name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

/**
 * The public storefront. Rendered in the (app) shell, so it never carries the
 * owner's sidebar -- visiting someone's page is visiting their page. The owner's
 * own copy of this view lives at /profile inside the private shell.
 */
export default async function AnalystProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const view = await buildProfileView(handle);
  if (!view) notFound();

  return (
    <div className="mx-auto w-full max-w-[var(--w-wide)]">
      <AnalystProfileView {...view} />
    </div>
  );
}
