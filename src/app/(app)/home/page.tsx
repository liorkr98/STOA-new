import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { TodayView } from "@/components/today/today-view";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { getSessionUserId } from "@/lib/db/auth";
import { buildDispatch } from "@/lib/dispatch/build-dispatch";
import { buildToday } from "@/lib/today/build-today";
import { getDispatchVideos } from "@/lib/video/dispatch-videos";

export const metadata: Metadata = { title: "Today" };

export default async function HomePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in?next=/home");

  const [dispatch, videos, today] = await Promise.all([
    buildDispatch(true),
    getDispatchVideos(),
    buildToday(userId),
  ]);

  // Only a genuinely empty issue falls back: a reader with no desk of their own
  // still gets Verdicts, the Standings, and Worth Reading, which need no
  // follows to be worth reading.
  const empty =
    dispatch.personalized &&
    !dispatch.lead &&
    today.desk.subscriptions.length === 0 &&
    today.desk.following.length === 0 &&
    today.verdicts.length === 0 &&
    today.saved.length === 0 &&
    today.mostWatched.length === 0 &&
    today.standings.length === 0 &&
    today.worthReading.length === 0;

  if (empty) {
    return (
      <div className="dispatch-page mx-auto flex min-h-[60vh] max-w-2xl items-center px-5 py-16">
        <EmptyState
          icon={<Compass size={32} />}
          title="Your dispatch is empty"
          body="Follow analysts or subscribe to their research. Their best calls will land here each morning, ranked by conviction and track record."
          action={
            <Link href="/discover?tab=researchers" className={buttonClass("primary", "md")}>
              Find analysts to follow
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <TodayView
      dispatch={dispatch}
      today={today}
      videoLead={videos.enabled ? videos.lead : null}
    />
  );
}
