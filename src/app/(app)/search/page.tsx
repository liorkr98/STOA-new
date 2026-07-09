import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { ReportCard } from "@/components/report-card";
import { AnalystCard } from "@/components/analyst-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchForm } from "@/components/search/search-form";
import { searchAll } from "@/lib/db/search";
import { resolvedCountByAuthor } from "@/lib/db/predictions";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = q.trim() ? await searchAll(q) : null;

  const analystsWithCounts = results
    ? await Promise.all(
        results.analysts.map(async (a) => ({
          analyst: a,
          resolved: await resolvedCountByAuthor(a.id),
        })),
      )
    : [];

  const totalHits = results
    ? analystsWithCounts.length + results.reports.length + results.tickers.length
    : 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="t-h1">Search</h1>
        <p className="t-body mt-1">Find analysts, tickers, and published research.</p>
      </div>

      <SearchForm initialQuery={q} />

      {!q.trim() ? (
        <EmptyState
          icon={<Search size={32} />}
          title="Search Stoa"
          body="Try a ticker like NVDA, an analyst name, or a topic in research summaries."
        />
      ) : results && totalHits === 0 ? (
        <EmptyState title={`No results for "${q}"`} body="Try a different ticker or analyst handle." />
      ) : results ? (
        <div className="flex flex-col gap-10">
          <p className="t-meta">
            <span className="num">{totalHits}</span> result{totalHits === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
          </p>

          {results.tickers.length > 0 && (
            <section>
              <h2 className="t-h3 mb-4">Markets</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.tickers.map((t) => (
                  <Link
                    key={t.ticker}
                    href={`/markets/${t.ticker}`}
                    className="rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong"
                  >
                    <div className="num font-semibold">{t.ticker}</div>
                    <div className="t-meta">
                      {t.name}
                      {t.sector ? ` · ${t.sector}` : ""}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {analystsWithCounts.length > 0 && (
            <section>
              <h2 className="t-h3 mb-4">Analysts</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {analystsWithCounts.map(({ analyst, resolved }) => (
                  <AnalystCard key={analyst.id} analyst={analyst} resolvedCalls={resolved} />
                ))}
              </div>
            </section>
          )}

          {results.reports.length > 0 && (
            <section>
              <h2 className="t-h3 mb-4">Research</h2>
              <div className="flex flex-col gap-5">
                {results.reports.map((r) => (
                  <ReportCard key={r.id} report={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}
