import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getSessionUserId } from "@/lib/db/auth";
import { listSavedReports } from "@/lib/db/saved";
import { listUnlockedReports } from "@/lib/db/library";
import { subscribedAnalystIds } from "@/lib/db/social";
import { publicTypeLabel } from "@/lib/compose/modes";
import type { Report } from "@/lib/types";
import { LibraryView, type LibraryItem } from "@/components/library/library-view";

export const metadata: Metadata = { title: "Library" };

function initialsOf(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}
function typeLabel(type: Report["type"]): string {
  return publicTypeLabel(type);
}
function badgeFor(type: Report["type"]): string {
  if (type === "research") return "Video · thesis";
  if (type === "short_post") return "Video · brief";
  // "call" is the pre-2026-09-24 verdict type; grading is retired, so it reads as a video.
  return "Video";
}

export default async function LibraryPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const [saved, unlocked, subIds] = await Promise.all([
    listSavedReports(userId),
    listUnlockedReports(userId),
    subscribedAnalystIds(userId),
  ]);

  const savedIds = new Set(saved.map((r) => r.id));
  const subSet = new Set(subIds);
  const unlockedById = new Map(unlocked.map((u) => [u.report.id, u]));

  // One combined list: saved items, then owned items not already saved.
  const combined: Report[] = [...saved];
  for (const u of unlocked) if (!savedIds.has(u.report.id)) combined.push(u.report);

  const items: LibraryItem[] = combined.map((r) => {
    const gated =
      String(r.access).startsWith("sub")
        ? "subscribers"
        : (r.price && r.price > 0) || r.access === "paid"
          ? "paid"
          : "free";
    const owned = unlockedById.has(r.id);
    const isSaved = savedIds.has(r.id);
    const subscribed = subSet.has(r.author_id);

    let state = "Saved · free";
    let chipTone: "ink" | "outline" = "outline";
    let locked = false;
    let sub: string | null = null;
    let subHref: string | null = null;

    if (owned) {
      const u = unlockedById.get(r.id)!;
      const dateLabel = u.unlockedAt ? format(new Date(u.unlockedAt), "d MMM") : null;
      const price = u.price ?? r.price;
      state = "Owned";
      chipTone = "ink";
      sub = `Unlocked${dateLabel ? ` ${dateLabel}` : ""}${price != null ? ` · $${price}` : ""}`;
    } else if (gated === "free") {
      state = "Saved · free";
    } else if (gated === "subscribers") {
      state = "Saved · subscribers";
      locked = !subscribed;
      sub = subscribed ? "Included in your subscription" : null;
    } else {
      state = "Saved · locked";
      locked = true;
      sub = `Unlock $${r.price} →`;
      subHref = `/report/${r.id}`;
    }

    return {
      id: r.id,
      href: `/report/${r.id}`,
      typeLabel: typeLabel(r.type),
      tag: r.ticker,
      tagIsTicker: Boolean(r.ticker),
      badge: badgeFor(r.type),
      title: r.title ?? "Untitled",
      deck: r.summary,
      analystName: r.author?.display_name ?? "Analyst",
      analystInitials: initialsOf(r.author?.display_name ?? "A"),
      analystHref: r.author?.handle ? `/analyst/${r.author.handle}` : "#",
      state,
      chipTone,
      locked,
      sub,
      subHref,
      owned,
      saved: isSaved,
      free: gated === "free",
    };
  });

  return (
    <div className="mx-auto w-full max-w-[var(--w-standard)]">
      <LibraryView items={items} />
    </div>
  );
}
