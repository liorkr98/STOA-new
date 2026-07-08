import { edgar, finnhub } from "@/lib/market";
import type { Estimate, FinancialStatement } from "@/lib/market/types";
import type { FilingRow } from "@/lib/db/financials";

/**
 * Company financials for the ticker page (Part G): an EDGAR income statement +
 * Finnhub estimates, server-rendered. Both providers degrade gracefully -- if a
 * key/User-Agent isn't set (or the ticker isn't covered), the section simply
 * doesn't render. Cached at the market layer, streamed via Suspense on the page.
 */

function fmtNum(v: number | null): string {
  if (v == null) return "-";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(2);
}

function surprisePct(est: number | null, act: number | null): number | null {
  if (est == null || act == null || est === 0) return null;
  return (act - est) / Math.abs(est);
}

function freqLabel(freq: string): string {
  return freq === "annual" ? "10-K" : "10-Q";
}

export async function CompanyFinancials({
  ticker,
  filings = [],
}: {
  ticker: string;
  filings?: FilingRow[];
}) {
  let statement: FinancialStatement | null = null;
  let estimates: Estimate[] | null = null;
  try {
    statement = await edgar.getStatement(ticker, "income", 5);
  } catch {
    statement = null;
  }
  try {
    estimates = await finnhub.getEpsEstimates(ticker);
  } catch {
    estimates = null;
  }

  if (!statement && (!estimates || estimates.length === 0)) return null;

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <div className="mb-5">
        <h2 className="t-h3">Financials and filings</h2>
        <p className="t-meta mt-1">Official filing data with consensus earnings context.</p>
      </div>

      {filings.length > 0 && (
        <div className="mb-6">
          <h3 className="t-eyebrow mb-2">Latest filings</h3>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {filings.map((filing) => (
              <article
                key={`${filing.symbol}-${filing.period_end}-${filing.frequency}`}
                className="rounded-[var(--radius-btn)] border border-border bg-[var(--paper)] px-3 py-2.5"
              >
                <p className="num text-xs text-text-faint">{filing.period_end}</p>
                <p className="mt-0.5 text-sm font-medium text-text">{freqLabel(filing.frequency)}</p>
                <div className="mt-2 space-y-1 text-xs text-text-mute">
                  <p className="flex items-center justify-between gap-2">
                    <span>Revenue</span>
                    <span className="num text-text">{filing.revenue == null ? "-" : fmtNum(filing.revenue)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span>Net income</span>
                    <span className="num text-text">
                      {filing.net_income == null ? "-" : fmtNum(filing.net_income)}
                    </span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
      {statement && statement.periods.length > 0 && (
        <div>
          <h3 className="t-eyebrow mb-2">Income statement</h3>
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-left">
                    Line
                  </th>
                  {statement.periods.map((p) => (
                    <th
                      key={p}
                      className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-right"
                    >
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statement.lines.map((line) => (
                  <tr key={line.concept} className="border-t border-border">
                    <td className="px-4 py-2">{line.label}</td>
                    {line.values.map((v, i) => (
                      <td key={i} className="px-4 py-2 text-right">
                        {v == null ? (
                          <span className="text-text-faint">-</span>
                        ) : (
                          <span className="num">{fmtNum(v)}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {statement.source?.asOf && (
            <p className="t-meta mt-1.5 text-[11px]">Source: EDGAR, last filed {statement.source.asOf}</p>
          )}
        </div>
      )}

      {estimates && estimates.length > 0 && (
        <div>
          <h3 className="t-eyebrow mb-2">EPS estimates vs actuals</h3>
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-left">
                    Period
                  </th>
                  <th className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-right">
                    Est.
                  </th>
                  <th className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-right">
                    Actual
                  </th>
                  <th className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-right">
                    Surprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {estimates.slice(-8).map((e) => {
                  const s = surprisePct(e.epsEstimate, e.epsActual);
                  return (
                    <tr key={e.period} className="border-t border-border">
                      <td className="num px-4 py-2">{e.period}</td>
                      <td className="num px-4 py-2 text-right">
                        {e.epsEstimate == null ? "-" : e.epsEstimate.toFixed(2)}
                      </td>
                      <td className="num px-4 py-2 text-right">
                        {e.epsActual == null ? "-" : e.epsActual.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {s == null ? (
                          <span className="text-text-faint">-</span>
                        ) : (
                          <span
                            className="num"
                            style={{ color: s >= 0 ? "var(--up)" : "var(--down)" }}
                          >
                            {s >= 0 ? "+" : ""}
                            {(s * 100).toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
