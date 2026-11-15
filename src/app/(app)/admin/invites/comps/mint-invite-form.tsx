"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { mintInvite, type InviteActionState } from "@/app/actions/invites";
import { buttonClass } from "@/components/ui/button";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("ink", "md")}>
      {pending ? "Creating..." : "Create invite link"}
    </button>
  );
}

export function MintInviteForm() {
  const [state, action] = useActionState<InviteActionState, FormData>(mintInvite, null);

  return (
    <form action={action} className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-body">
          Note
          <input
            name="note"
            maxLength={120}
            placeholder="Optional, only you see this"
            className="h-11 rounded-field border border-border bg-bg px-3 text-body"
          />
        </label>
        <label className="flex w-24 flex-col gap-1.5 text-body">
          Uses
          <input
            name="max_uses"
            type="number"
            min={1}
            max={50}
            defaultValue={1}
            className="h-11 rounded-field border border-border bg-bg px-3 text-body"
          />
        </label>
        <label className="flex w-40 flex-col gap-1.5 text-body">
          Lasts
          <select
            name="horizon"
            defaultValue="30d"
            className="h-11 rounded-field border border-border bg-bg px-3 text-body"
          >
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="never">No end date</option>
          </select>
        </label>
        <Submit />
      </div>
      {state?.error && (
        <p role="alert" className="mt-3 text-body text-[var(--down)]">
          {state.error}
        </p>
      )}
      {state?.url && <CopyInviteUrl url={state.url} />}
    </form>
  );
}

function CopyInviteUrl({ url }: { url: string }) {
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <p className="num min-w-0 flex-1 break-all rounded-field border border-border bg-bg px-3 py-2 text-ticker">
        {url}
      </p>
      <button
        type="button"
        className={buttonClass("ghost", "md")}
        onClick={() => void navigator.clipboard.writeText(url)}
      >
        Copy
      </button>
    </div>
  );
}
