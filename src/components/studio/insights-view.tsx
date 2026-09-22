import Link from "next/link";
import { compact } from "@/lib/format";

export type InsightClip = {
  id: string;
  reportId: string;
  href: string;
  title: string;
  status: "processing" | "ready" | "failed";
  published: boolean;
  plays: number;
  completions: number;
  clickThroughs: number;
  pageViews: number;
};

export type InsightTotals = {
  plays: number;
  completions: number;
  clickThroughs: number;
  pageViews: number;
};

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface-2 px-5 py-4">
      <div className="num text-[11px] uppercase tracking-[0.18em] text-text-mute">{label}</div>
      <div className="num mt-2.5 text-[24px] font-semibold tracking-tight">{value}</div>
      <p className="mt-2 text-[12px] leading-snug text-text-faint">{note}</p>
    </div>
  );
}

function rate(part: number, whole: number): string {
  if (whole <= 0) return "-";
  return `${Math.round((part / whole) * 100)}%`;
}

/**
 * First-party creator analytics. Plays come from video_view_events (Feed and
 * publication players). Page views come from report opens. This is not a
 * Bunny or Mux dashboard; those stay ops tools.
 */
export function InsightsView({ rows, totals }: { rows: InsightClip[]; totals: InsightTotals }) {
  return (
    <div className="mx-auto flex w-full max-w-[var(--w-wide)] flex-col gap-10">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Insights</h1>
        <p className="t-body mt-2">Plays on your clips, and opens of the written page. Two different counts.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3.5">
        <Metric
          label="Plays"
          value={compact(totals.plays)}
          note="Someone started the clip on the Feed or a publication page."
        />
        <Metric
          label="Finished"
          value={compact(totals.completions)}
          note="The play reached the end."
        />
        <Metric
          label="Opened the page"
          value={compact(totals.pageViews)}
          note="Opens of the publication page, with or without a video."
        />
        <Metric
          label="Through to the page"
          value={compact(totals.clickThroughs)}
          note="From a playing clip, they opened the full publication."
        />
      </div>

      <section className="flex flex-col gap-4">
        <div className="num border-b border-[var(--ink)] pb-3 text-[10px] uppercase tracking-[0.2em] text-text-mute">
          By video
        </div>
        {rows.length === 0 ? (
          <p className="t-meta">No clips yet. Publish a video and plays land here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="num py-2 pr-4 text-[10px] font-medium uppercase tracking-[0.16em] text-text-faint">
                    Publication
                  </th>
                  <th className="num py-2 pr-4 text-right text-[10px] font-medium uppercase tracking-[0.16em] text-text-faint">
                    Plays
                  </th>
                  <th className="num py-2 pr-4 text-right text-[10px] font-medium uppercase tracking-[0.16em] text-text-faint">
                    Finished
                  </th>
                  <th className="num py-2 pr-4 text-right text-[10px] font-medium uppercase tracking-[0.16em] text-text-faint">
                    Finish rate
                  </th>
                  <th className="num py-2 text-right text-[10px] font-medium uppercase tracking-[0.16em] text-text-faint">
                    Page views
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="py-3 pr-4">
                      <Link href={r.href} className="text-sm font-medium text-text hover:underline">
                        {r.title}
                      </Link>
                      {r.status !== "ready" ? (
                        <p className="num mt-0.5 text-[10px] uppercase tracking-[0.14em] text-text-faint">
                          {r.status === "processing" ? "Processing" : "Failed"}
                        </p>
                      ) : !r.published ? (
                        <p className="num mt-0.5 text-[10px] uppercase tracking-[0.14em] text-text-faint">Draft</p>
                      ) : null}
                    </td>
                    <td className="num py-3 pr-4 text-right text-sm">{compact(r.plays)}</td>
                    <td className="num py-3 pr-4 text-right text-sm">{compact(r.completions)}</td>
                    <td className="num py-3 pr-4 text-right text-sm">{rate(r.completions, r.plays)}</td>
                    <td className="num py-3 text-right text-sm">{compact(r.pageViews)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
