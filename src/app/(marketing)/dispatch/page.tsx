import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DispatchView } from "@/components/dispatch/dispatch-view";
import { getSessionUserId } from "@/lib/db/auth";
import { buildDispatch } from "@/lib/dispatch/build-dispatch";
import { getDispatchVideos } from "@/lib/video/dispatch-videos";

export const metadata: Metadata = {
  title: "Today's Dispatch",
  description: "Stoa's daily editorial briefing of locked calls and graded research.",
};

/** Public daily dispatch. Signed-in readers use /home. */
export default async function PublicDispatchPage() {
  const userId = await getSessionUserId();
  if (userId) redirect("/home");

  const [dispatch, videos] = await Promise.all([buildDispatch(false), getDispatchVideos()]);
  return (
    <DispatchView
      dispatch={dispatch}
      mode="public"
      videoFirst={videos.enabled}
      videoLead={videos.lead}
      videoSecondary={videos.secondary}
    />
  );
}
