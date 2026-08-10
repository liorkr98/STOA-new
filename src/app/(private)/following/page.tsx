import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/db/auth";
import { listFollowedAnalysts } from "@/lib/db/social";
import { FollowingView, type FollowCreator } from "@/components/following/following-view";

export const metadata: Metadata = { title: "Following" };

function initialsOf(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default async function FollowingPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const analysts = await listFollowedAnalysts(userId);

  const creators: FollowCreator[] = analysts.map((a) => ({
    id: a.id,
    href: `/analyst/${a.handle}`,
    name: a.display_name,
    initials: initialsOf(a.display_name),
    score: a.score ?? null,
    specialty: a.headline?.trim().toUpperCase() || "INDEPENDENT ANALYST",
    // Placeholder: no per-analyst monthly publication count in the backend yet.
    pubs: "— PUBLICATIONS THIS MONTH",
  }));

  return <FollowingView creators={creators} />;
}
