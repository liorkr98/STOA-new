import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import {
  Bell,
  Heart,
  ChatCircle,
  UserPlus,
  Megaphone,
  Sparkle,
  CurrencyDollar,
} from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getSessionUserId } from "@/lib/db/auth";
import { listNotifications, type Notification } from "@/lib/db/notifications";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";

export const metadata: Metadata = { title: "Inbox" };

const KIND_ICON: Record<string, typeof Bell> = {
  like: Heart,
  comment: ChatCircle,
  follow: UserPlus,
  publication: Megaphone,
  subscribe: Sparkle,
  sale: CurrencyDollar,
};

const GROUP_LABELS = ["Today", "Yesterday", "This week", "Earlier"] as const;
type GroupLabel = (typeof GROUP_LABELS)[number];

function groupByDay(notifications: Notification[]): { label: GroupLabel; items: Notification[] }[] {
  const groups: Record<GroupLabel, Notification[]> = {
    Today: [],
    Yesterday: [],
    "This week": [],
    Earlier: [],
  };
  for (const n of notifications) {
    const date = new Date(n.created_at);
    if (isToday(date)) groups.Today.push(n);
    else if (isYesterday(date)) groups.Yesterday.push(n);
    else if (isThisWeek(date)) groups["This week"].push(n);
    else groups.Earlier.push(n);
  }
  return GROUP_LABELS.map((label) => ({ label, items: groups[label] })).filter(
    (g) => g.items.length > 0,
  );
}

export default async function InboxPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const notifications = await listNotifications(userId);
  const unread = notifications.filter((n) => !n.read).length;
  const groups = groupByDay(notifications);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="t-h1">Inbox</h1>
          <p className="t-body mt-1">
            {unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "You're all caught up."}
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className={buttonClass("secondary", "sm")}>
              Mark all read
            </button>
          </form>
        )}
      </div>

      {groups.length > 0 ? (
        <div className="flex flex-col gap-6">
          {groups.map(({ label, items }) => (
            <div key={label}>
              <p className="t-eyebrow mb-2">{label}</p>
              <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
                {items.map((n) => {
                  const Icon = KIND_ICON[n.kind] ?? Bell;
                  return (
                    <li
                      key={n.id}
                      className={`border-b border-border px-5 py-4 last:border-0 ${n.read ? "" : "bg-accent-weak/30"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {n.actor ? (
                            <Link href={`/analyst/${n.actor.handle}`} className="shrink-0">
                              <Avatar src={n.actor.avatar_url} name={n.actor.display_name} size="md" />
                            </Link>
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-mute">
                              <Icon size={18} />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm ${n.read ? "text-text-mute" : "font-medium text-text"}`}>
                              {n.actor && (
                                <span className="font-semibold text-text">{n.actor.display_name} </span>
                              )}
                              {n.body ?? n.kind}
                            </p>
                            <p className="t-meta mt-1 flex items-center gap-1.5">
                              <Icon size={12} />
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {n.link && (
                            <Link href={n.link} className={buttonClass("secondary", "sm")}>
                              View
                            </Link>
                          )}
                          {!n.read && (
                            <form action={markNotificationRead.bind(null, n.id)}>
                              <button type="submit" className="text-xs text-text-faint hover:text-text">
                                Mark read
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bell size={32} />}
          title="No notifications yet"
          body="Follows, likes, comments, new publications from analysts you follow, and sales all show up here."
        />
      )}
    </div>
  );
}
