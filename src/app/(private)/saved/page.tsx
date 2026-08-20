import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getSessionUserId } from "@/lib/db/auth";
import { listSavedReports } from "@/lib/db/saved";
import { listUnlockedReports } from "@/lib/db/library";
import { subscribedAnalystIds } from "@/lib/db/social";
import type { Report } from "@/lib/types";
import { LibraryView, type LibraryItem } from "@/components/library/library-view";

export const metadata: Metadata = { title: "Library" };

function initialsOf(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}
function typeLabel(type: Report["type"]): string {
  if (type === "research") return "RESEARCH";
  if (type === "short_post") return "NOTE";
  return "CALL";
}
function badgeFor(type: Report["type"]): string {
  if (type === "research") return "VIDEO · THESIS";
  if (type === "short_post") return "VIDEO · NOTE";
  return "VIDEO · CALL";
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

    let state = "SAVED · FREE";
    let chipTone: "ink" | "outline" = "outline";
    let locked = false;
    let sub: string | null = null;
    let subHref: string | null = null;

    if (owned) {
      const u = unlockedById.get(r.id)!;
      const dateLabel = u.unlockedAt ? format(new Date(u.unlockedAt), "d MMM").toUpperCase() : null;
      const price = u.price ?? r.price;
      state = "OWNED";
      chipTone = "ink";
      sub = `UNLOCKED${dateLabel ? ` ${dateLabel}` : ""}${price != null ? ` · $${price}` : ""}`;
    } else if (gated === "free") {
      state = "SAVED · FREE";
    } else if (gated === "subscribers") {
      state = "SAVED · SUBSCRIBERS";
      locked = !subscribed;
      sub = subscribed ? "INCLUDED IN YOUR SUBSCRIPTION" : null;
    } else {
      state = "SAVED · LOCKED";
      locked = true;
      sub = `UNLOCK $${r.price} →`;
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
      analystScore: r.author?.score ?? null,
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

  return <LibraryView items={items} />;
}
