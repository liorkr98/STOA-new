import Link from "next/link";
import type { Metadata } from "next";
import { format } from "date-fns";
import { Users } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { getSessionProfile } from "@/lib/db/auth";
import { listAnalystSubscribers } from "@/lib/db/subscriptions";
import { subscriberCount } from "@/lib/db/social";
import { Stat } from "@/components/ui/stat";
import { compact } from "@/lib/format";

export const metadata: Metadata = { title: "Audience" };

export default async function StudioAudiencePage() {
  const profile = (await getSessionProfile())!;
  const [subs, count] = await Promise.all([
    listAnalystSubscribers(profile.id),
    subscriberCount(profile.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="t-h1">Audience</h1>
        <p className="t-body mt-1">People who subscribe to your research.</p>
      </div>

      <div className="grid grid-cols-2 gap-5 rounded-[var(--radius-card)] border border-border bg-surface p-6 md:grid-cols-3">
        <Stat label="Active subscribers" value={compact(count)} />
        <Stat label="Monthly sub price" value={profile.sub_price ? `$${profile.sub_price}` : "Not set"} />
        <Stat label="Followers" value={compact(profile.followers_count)} />
      </div>

      {subs.length > 0 ? (
        <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          {subs.map((s) => (
            <li
              key={s.subscriber_id}
              className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-0"
            >
              <div className="flex items-center gap-3">
                {s.subscriber && (
                  <Avatar src={s.subscriber.avatar_url} name={s.subscriber.display_name} size="md" />
                )}
                <div>
                  <span className="font-medium">
                    {s.subscriber?.display_name ?? "Subscriber"}
                  </span>
                  <p className="t-meta">
                    Since {format(new Date(s.started_at), "MMM d, yyyy")} · renews{" "}
                    {format(new Date(s.renews_at), "MMM d")}
                  </p>
                </div>
              </div>
              {s.subscriber?.handle && (
                <Link
                  href={`/analyst/${s.subscriber.handle}`}
                  className="text-sm text-text-mute hover:text-accent"
                >
                  Profile
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Users size={32} />}
          title="No subscribers yet"
          body="Publish consistently and share your public profile to grow your audience."
          action={
            <Link href={`/analyst/${profile.handle}`} className="text-sm text-accent hover:underline">
              View your public profile
            </Link>
          }
        />
      )}
    </div>
  );
}
