import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { listPollsByCreator } from "@/lib/db/polls";
import { CreatePollForm } from "@/components/polls/create-poll-form";
import { PollCard } from "@/components/polls/poll-card";
import { DeletePollButton } from "@/components/polls/delete-poll-button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Polls" };

/**
 * Studio polls (H3): create sentiment/choice/coverage/target polls and see
 * live results. Community sentiment only -- never scored.
 */
export default async function StudioPollsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role !== "analyst" && profile.role !== "admin") redirect("/studio");

  const polls = await listPollsByCreator(profile.id, 20);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="t-h1">Polls</h1>
        <p className="t-body mt-1">
          Ask your audience where they stand. Poll results are community sentiment and never touch
          your track record.
        </p>
      </div>

      <CreatePollForm />

      {polls.length === 0 ? (
        <EmptyState title="No polls yet" body="Create your first poll above." />
      ) : (
        <div className="flex flex-col gap-4">
          {polls.map((poll) => (
            <div key={poll.id} className="relative">
              <PollCard poll={poll} isAuthed />
              <DeletePollButton pollId={poll.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
