import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { Link2 } from "lucide-react";
import { getSessionProfile } from "@/lib/db/auth";
import { getInvitesForAdmin, revokeInviteAction } from "@/app/actions/invites";
import { MintInviteForm } from "./comps/mint-invite-form";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Invites · Admin" };

export default async function AdminInvitesPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role !== "admin") notFound();

  const invites = await getInvitesForAdmin();
  const nowIso = new Date().toISOString();
  const live = invites.filter((i) => !i.revoked_at && i.use_count < i.max_uses && (!i.expires_at || i.expires_at > nowIso));

  return (
    <div className="mx-auto max-w-[var(--w-reading)] py-8">
      <div className="flex items-start gap-3">
        <Link2 className="mt-1 h-6 w-6 text-text-mute" aria-hidden />
        <div>
          <h1 className="t-headline">Invite links</h1>
          <p className="t-body mt-1 text-text-mute">
            {live.length} open · {invites.length} created. Anyone with a live link can create an
            account. People who already have an account sign in as usual.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <MintInviteForm />
      </div>

      {invites.length === 0 ? (
        <p className="mt-12 text-center text-text-mute">No invites yet.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {invites.map((invite) => {
            const spent = invite.use_count >= invite.max_uses;
            const expired = Boolean(invite.expires_at && invite.expires_at <= nowIso);
            const status = invite.revoked_at
              ? "Revoked"
              : spent
                ? "Used up"
                : expired
                  ? "Expired"
                  : "Open";
            return (
              <li
                key={invite.id}
                className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="num text-body">
                    …{invite.token_prefix} · {invite.use_count}/{invite.max_uses} uses · {status}
                  </p>
                  <p className="mt-1 text-ticker text-text-mute">
                    {invite.note ? `${invite.note} · ` : ""}
                    created {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                    {invite.expires_at
                      ? ` · ends ${formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}`
                      : ""}
                  </p>
                </div>
                {!invite.revoked_at && !spent && (
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="id" value={invite.id} />
                    <button type="submit" className={buttonClass("ghost", "sm")}>
                      Revoke
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
