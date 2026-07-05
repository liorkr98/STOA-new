import type { ProfileSection } from "@/lib/editor/types";
import type { Report } from "@/lib/types";
import { ReportCard } from "@/components/report-card";

/**
 * Public renderer for the addable storefront sections (B3): richText, faq, and
 * featuredReport, in the analyst's order. Everything stays on surface cards and
 * inherits the storefront's scoped accent/font vars. The disclosure block is
 * deliberately NOT a section type (AGENTS.md rule 11).
 */

interface FaqItem {
  q: string;
  a: string;
}

export function StorefrontSections({
  sections,
  reports,
}: {
  sections: ProfileSection[];
  reports: Report[];
}) {
  const visible = sections.filter((s) => s.visible);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {visible.map((section) => {
        if (section.type === "richText") {
          const title = String(section.data?.title ?? "");
          const body = String(section.data?.body ?? "");
          if (!body.trim()) return null;
          return (
            <section key={section.id} className="surface p-6">
              {title && <h2 className="t-h3">{title}</h2>}
              <p className="t-body mt-2 whitespace-pre-wrap">{body}</p>
            </section>
          );
        }

        if (section.type === "faq") {
          const items = (Array.isArray(section.data?.items) ? section.data.items : []) as FaqItem[];
          const filled = items.filter((i) => i.q?.trim() && i.a?.trim());
          if (filled.length === 0) return null;
          return (
            <section key={section.id} className="surface p-6">
              <h2 className="t-h3">FAQ</h2>
              <div className="mt-3 flex flex-col">
                {filled.map((item, i) => (
                  <details key={i} className="group border-t border-border py-3 first:border-0">
                    <summary className="cursor-pointer list-none text-sm font-medium text-text hover:text-accent focus-ring rounded-[var(--r-tag)]">
                      {item.q}
                    </summary>
                    <p className="t-body mt-2 text-sm">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          );
        }

        if (section.type === "featuredReport") {
          const reportId = String(section.data?.reportId ?? "");
          const report = reports.find((r) => r.id === reportId);
          if (!report) return null;
          return (
            <section key={section.id}>
              <h2 className="t-eyebrow mb-3">Featured research</h2>
              <ReportCard report={report} />
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}
