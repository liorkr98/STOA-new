import { showLegalPlaceholderBanner } from "@/lib/legal/constants";

export function LegalPlaceholderBanner() {
  if (!showLegalPlaceholderBanner()) return null;
  return (
    <div
      role="note"
      className="mb-8 rounded-[var(--radius-btn)] border border-[var(--brass)]/40 bg-[var(--brass)]/10 px-4 py-3 text-sm text-text"
    >
      <span aria-hidden="true">⚠ </span>
      <strong>ATTORNEY REVIEW REQUIRED</strong> — placeholder content, do not treat as final.
    </div>
  );
}

interface LegalPageShellProps {
  title: string;
  children: React.ReactNode;
}

export function LegalPageShell({ title, children }: LegalPageShellProps) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <LegalPlaceholderBanner />
      <h1 className="t-h1">{title}</h1>
      <div className="mt-8 flex flex-col gap-6">{children}</div>
    </div>
  );
}

export function PlaceholderSection({ title }: { title: string }) {
  return (
    <section aria-labelledby={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <h2
        id={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
        className="t-h3 text-text"
      >
        {title}
      </h2>
      <p className="t-body mt-2 text-text-mute">
        [Section: {title} — pending legal draft]
      </p>
    </section>
  );
}

interface LegalSectionProps {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export function LegalSection({ title, paragraphs, bullets }: LegalSectionProps) {
  const id = `section-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="t-h3 text-text">
        {title}
      </h2>
      {paragraphs?.map((p) => (
        <p key={p.slice(0, 40)} className="t-body mt-2 text-text-mute">
          {p}
        </p>
      ))}
      {bullets && bullets.length > 0 && (
        <ul className="t-body mt-2 list-disc space-y-2 pl-5 text-text-mute">
          {bullets.map((b) => (
            <li key={b.slice(0, 40)}>{b}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
