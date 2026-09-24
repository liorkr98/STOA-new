import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { getSessionProfile } from "@/lib/db/auth";
import { listNotifications } from "@/lib/db/notifications";
import { InboxView, type InboxCategory, type InboxItem } from "@/components/inbox/inbox-view";

export const metadata: Metadata = { title: "Inbox" };

function categoryFor(kind: string): InboxCategory {
  if (kind === "follow" || kind === "subscribe") return "audience";
  if (kind === "publication") return "publications";
  if (kind === "sale") return "money";
  return "social"; // like, comment, and anything else
}

/**
 * Demo items shown only in local development, so the two-zone design (including
 * the "Needs you" variants that the backend can't emit yet) is reviewable. They
 * never render in a deployed build, so no fabricated financial notifications
 * ever reach a real user.
 */
function demoItems(isAnalyst: boolean): InboxItem[] {
  const base: InboxItem[] = [
    { id: "ph-renew", zone: "needs", category: "money", title: "Your subscription to Lena Kowalczyk renews in 3 days", timeLabel: "6H AGO", read: false, href: "#", action: "Manage", demo: true },
    { id: "ph-pay", zone: "needs", category: "money", danger: true, title: "Your payment method failed — renewals are paused", timeLabel: "1D AGO", read: false, href: "#", action: "Fix payment", demo: true },
  ];
  const analyst: InboxItem[] = [
    { id: "ph-payout", zone: "needs", category: "money", title: "Payout ready · $128.40", timeLabel: "1D AGO", read: false, href: "#", action: "View payout", demo: true },
  ];
  const good: InboxItem[] = [
    { id: "ph-done", zone: "good", category: "money", title: "You reviewed the payment issue", confirmed: true, timeLabel: "JUST NOW", read: true, href: null, action: null, demo: true },
    { id: "ph-pub", zone: "good", category: "publications", title: "Lena Kowalczyk published: The Blackwell sequel", timeLabel: "5H AGO", read: false, href: "#", action: "View", demo: true },
    { id: "ph-follow", zone: "good", category: "audience", title: "Kenji Ito started following you", timeLabel: "2D AGO", read: true, href: "#", action: "View profile", demo: true },
  ];
  const analystGood: InboxItem[] = [
    { id: "ph-sub", zone: "good", category: "audience", title: "New subscriber · Priya Raman joined Pro", timeLabel: "1D AGO", read: true, href: "#", action: "View", demo: true },
  ];
  return [...base, ...(isAnalyst ? analyst : []), ...good, ...(isAnalyst ? analystGood : [])];
}

export default async function InboxPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  const isAnalyst = profile.role === "analyst" || profile.role === "admin";

  const notifications = await listNotifications(profile.id);

  const real: InboxItem[] = notifications.map((n) => ({
    id: n.id,
    zone: "good", // real notification kinds are all "good to know" today
    category: categoryFor(n.kind),
    title: `${n.actor ? `${n.actor.display_name} ` : ""}${n.body ?? n.kind}`,
    timeLabel: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }).toUpperCase(),
    read: n.read,
    href: n.link,
    action: n.link ? "View" : null,
  }));

  const items =
    process.env.NODE_ENV === "development" ? [...demoItems(isAnalyst), ...real] : real;

  return (
    <div className="mx-auto w-full max-w-[var(--w-standard)]">
      <InboxView items={items} isAnalyst={isAnalyst} />
    </div>
  );
}
