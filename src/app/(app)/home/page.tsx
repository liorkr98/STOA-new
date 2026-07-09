import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { DispatchView } from "@/components/dispatch/dispatch-view";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { getSessionUserId } from "@/lib/db/auth";
import { buildDispatch } from "@/lib/dispatch/build-dispatch";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in?next=/home");

  const dispatch = await buildDispatch(true);
  const empty =
    dispatch.personalized &&
    !dispatch.lead &&
    dispatch.secondary.length === 0 &&
    dispatch.wire.length === 0 &&
    dispatch.resolved.length === 0 &&
    dispatch.leaderboard.length === 0;

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

  return <DispatchView dispatch={dispatch} mode="home" />;
}
