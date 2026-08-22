import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { Mail } from "lucide-react";
import { getSessionProfile } from "@/lib/db/auth";
import { listContactMessages } from "@/lib/db/contact";
import { ContactStatusButtons } from "./comps/contact-status-buttons";

export const metadata: Metadata = { title: "Contact inbox · Admin" };

const statusBadge: Record<string, { label: string; className: string }> = {
  new: {
    label: "New",
    className: "bg-[color-mix(in_srgb,var(--verdigris)_14%,transparent)] text-[var(--verdigris)]",
  },
  read: {
    label: "Read",
    className: "bg-[color-mix(in_srgb,var(--brass)_14%,transparent)] text-[var(--brass)]",
  },
  archived: {
    label: "Archived",
    className: "bg-[color-mix(in_srgb,var(--ink)_10%,transparent)] text-text-mute",
  },
};

const topicLabels: Record<string, string> = {
  general: "General",
  support: "Support",
  sales: "Sales",
  press: "Press",
  accessibility: "Accessibility",
  other: "Other",
};

export default async function AdminContactPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role !== "admin") notFound();

  const { id: highlightId } = await searchParams;
  const messages = await listContactMessages();
  const open = messages.filter((m) => m.status !== "archived");
  const archived = messages.filter((m) => m.status === "archived");

  return (
    <div className="mx-auto max-w-[var(--w-reading)] py-8">
      <div className="flex items-start gap-3">
        <Mail className="mt-1 h-6 w-6 text-text-mute" aria-hidden />
        <div>
          <h1 className="t-h1">Customer contact</h1>
          <p className="t-body mt-1 text-text-mute">
            {open.filter((m) => m.status === "new").length} new · {open.length} open ·{" "}
            {archived.length} archived · public form at{" "}
            <a href="/contact" className="text-accent underline hover:no-underline">
              /contact
            </a>
          </p>
        </div>
      </div>

      {messages.length === 0 && (
        <p className="mt-12 text-center text-text-mute">No customer messages yet.</p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {open.map((msg) => (
          <ContactCard key={msg.id} msg={msg} highlighted={msg.id === highlightId} />
        ))}
      </div>

      {archived.length > 0 && (
        <>
          <h2 className="t-h3 mt-10">Archived</h2>
          <div className="mt-4 flex flex-col gap-4">
            {archived.map((msg) => (
              <ContactCard key={msg.id} msg={msg} highlighted={msg.id === highlightId} muted />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ContactCard({
  msg,
  highlighted,
  muted = false,
}: {
  msg: {
    id: string;
    name: string;
    email: string;
    topic: string;
    subject: string;
    message: string;
    status: string;
    submitted_at: string;
  };
  highlighted: boolean;
  muted?: boolean;
}) {
  const badge = statusBadge[msg.status] ?? statusBadge.new;

  return (
    <article
      id={msg.id}
      className={[
        "rounded-[var(--radius-card)] border bg-surface p-5 flex flex-col gap-4",
        highlighted ? "border-[var(--verdigris)]" : "border-border",
        muted ? "opacity-80" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{msg.name}</p>
          <a href={`mailto:${msg.email}`} className="text-sm text-accent underline hover:no-underline">
            {msg.email}
          </a>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-[var(--radius-tag)] px-2 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
          <span className="text-xs text-text-mute">
            {formatDistanceToNow(new Date(msg.submitted_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      <div className="text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-text-mute">
          {topicLabels[msg.topic] ?? msg.topic} · {msg.subject}
        </p>
        <p className="mt-2 whitespace-pre-wrap">{msg.message}</p>
      </div>

      <ContactStatusButtons id={msg.id} status={msg.status as "new" | "read" | "archived"} />
    </article>
  );
}
