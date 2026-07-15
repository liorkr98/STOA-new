import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getSessionProfile } from "@/lib/db/auth";
import { submitContactMessage } from "@/app/actions/contact";
import { parseContactTopic } from "@/lib/db/contact";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Stoa team.",
};

const inputClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm focus-ring placeholder:text-text-mute";
const textareaClass =
  "w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm focus-ring placeholder:text-text-mute resize-none";

const topics = [
  { value: "general", label: "General question" },
  { value: "support", label: "Account or product support" },
  { value: "sales", label: "Sales or partnerships" },
  { value: "press", label: "Press or media" },
  { value: "accessibility", label: "Accessibility feedback" },
  { value: "other", label: "Something else" },
] as const;

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; topic?: string }>;
}) {
  const { submitted, topic: topicParam } = await searchParams;
  const profile = await getSessionProfile();
  const defaultTopic = parseContactTopic(String(topicParam ?? "general"));

  if (submitted === "1") {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-[var(--verdigris)]" aria-hidden />
          <h1 className="t-h2">Message sent</h1>
          <p className="t-body max-w-sm text-text-mute">
            Thanks for reaching out. We read every message and usually reply within one to two
            business days.
          </p>
          <Link href="/discover" className="text-sm text-accent underline hover:no-underline">
            Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <h1 className="t-h1">Contact us</h1>
      <p className="t-body mt-2 text-text-mute">
        Questions about Stoa, your account, analyst applications, or accessibility? Send us a note
        and we will get back to you.
      </p>

      <form action={submitContactMessage} className="mt-8 flex flex-col gap-5">
        <div className="absolute left-[-9999px] h-px w-px overflow-hidden" aria-hidden>
          <label htmlFor="company_website">Company website</label>
          <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
              <span className="ml-1 text-[var(--rust)]">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              autoComplete="name"
              className={inputClass}
              defaultValue={profile?.display_name ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
              <span className="ml-1 text-[var(--rust)]">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="topic" className="text-sm font-medium">
            Topic
          </label>
          <select id="topic" name="topic" className={inputClass} defaultValue={defaultTopic}>
            {topics.map((topic) => (
              <option key={topic.value} value={topic.value}>
                {topic.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="subject" className="text-sm font-medium">
            Subject
            <span className="ml-1 text-[var(--rust)]">*</span>
          </label>
          <input
            id="subject"
            name="subject"
            required
            className={inputClass}
            placeholder="What can we help with?"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="message" className="text-sm font-medium">
            Message
            <span className="ml-1 text-[var(--rust)]">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            className={textareaClass}
            placeholder="Tell us what you need. Include a page URL if this is about something specific on Stoa."
          />
        </div>

        <Button type="submit" size="lg">
          Send message
        </Button>
      </form>

      <p className="t-meta mt-6">
        Prefer email? Write to{" "}
        <a href="mailto:hello@stoa.app" className="text-accent underline hover:no-underline">
          hello@stoa.app
        </a>
        .
      </p>
    </div>
  );
}
