import { edgar, finnhub } from "@/lib/market";
import type { Estimate, FinancialStatement } from "@/lib/market/types";

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

export async function CompanyFinancials({ ticker }: { ticker: string }) {
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
    <div className="grid gap-8 lg:grid-cols-2">
      {statement && statement.periods.length > 0 && (
        <div>
          <h2 className="t-h3 mb-3">Income statement</h2>
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
            <p className="t-meta mt-1.5 text-[11px]">Source: EDGAR - last filed {statement.source.asOf}</p>
          )}
        </div>
      )}

      {estimates && estimates.length > 0 && (
        <div>
          <h2 className="t-h3 mb-3">EPS estimates vs actuals</h2>
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
  );
}
