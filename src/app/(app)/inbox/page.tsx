import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { getSessionUserId } from "@/lib/db/auth";
import { listNotifications } from "@/lib/db/notifications";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const notifications = await listNotifications(userId);
  const unread = notifications.filter((n) => !n.read).length;

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

      {notifications.length > 0 ? (
        <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="border-b border-border px-5 py-4 last:border-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.read ? "text-text-mute" : "font-medium text-text"}`}>
                    {n.body ?? n.kind}
                  </p>
                  <p className="t-meta mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    {n.actor ? ` · ${n.actor.display_name}` : ""}
                  </p>
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
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Bell size={32} />}
          title="No notifications yet"
          body="When someone subscribes to you or unlocks your work, it will show up here."
        />
      )}
    </div>
  );
}
