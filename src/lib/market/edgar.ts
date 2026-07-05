import { z } from "zod";
import { cached, TTL } from "./cache";
import { normalizeSymbol } from "./symbols";
import {
  type FinancialStatement,
  FinancialStatementSchema,
  MarketDataError,
  type FilingFigure,
  FilingFigureSchema,
  type SourceRef,
  type StatementKind,
  type StatementLine,
} from "./types";

/**
 * SEC EDGAR (data.sec.gov). Free, official, no key -- the citable source of
 * truth for any figure a reader can trace to a filing (the notary/ledger
 * brand). Server-only: no CORS, a real User-Agent is required, 10 req/s cap.
 * See docs/DATA_STACK.md section 2.1.
 */

const CIK_MAP_URL = "https://www.sec.gov/files/company_tickers.json";
const XBRL_BASE = "https://data.sec.gov/api/xbrl";

function userAgent(): string {
  const ua = process.env.SEC_EDGAR_USER_AGENT;
  if (!ua) {
    throw new MarketDataError(
      "edgar",
      "SEC_EDGAR_USER_AGENT is not set. EDGAR requires a descriptive User-Agent with contact info.",
    );
  }
  return ua;
}

async function secFetch(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": userAgent(), Accept: "application/json" },
    });
  } catch (cause) {
    throw new MarketDataError("edgar", `EDGAR request failed: ${url}`, cause);
  }
  if (res.status === 404) {
    throw new MarketDataError("edgar", `EDGAR resource not found: ${url}`);
  }
  if (!res.ok) {
    throw new MarketDataError("edgar", `EDGAR responded ${res.status} for ${url}`);
  }
  return res.json();
}

const CikMapSchema = z.record(
  z.string(),
  z.object({ cik_str: z.number(), ticker: z.string(), title: z.string() }),
);

/** Resolve a ticker to its zero-padded 10-digit CIK (EDGAR's key). */
export async function resolveCik(symbol: string): Promise<string> {
  const sym = normalizeSymbol(symbol);
  const map = await cached("edgar:cikmap", TTL.cikMap, async () => {
    const parsed = CikMapSchema.parse(await secFetch(CIK_MAP_URL));
    const byTicker = new Map<string, number>();
    for (const row of Object.values(parsed)) {
      byTicker.set(row.ticker.toUpperCase(), row.cik_str);
    }
    return byTicker;
  });
  const cik = map.get(sym);
  if (cik == null) {
    throw new MarketDataError("edgar", `No CIK found for ${sym}`);
  }
  return String(cik).padStart(10, "0");
}

const ConceptUnitEntrySchema = z.object({
  start: z.string().optional(),
  end: z.string(),
  val: z.number(),
  accn: z.string().optional(),
  fy: z.number().optional(),
  fp: z.string().optional(),
  form: z.string().optional(),
  filed: z.string().optional(),
});

const CompanyConceptSchema = z.object({
  cik: z.number(),
  taxonomy: z.string(),
  tag: z.string(),
  label: z.string().nullable().optional(),
  units: z.record(z.string(), z.array(ConceptUnitEntrySchema)),
});

/**
 * All reported values for one XBRL concept (e.g. "Revenues", "NetIncomeLoss"),
 * normalized to FilingFigure[] and sorted by period end ascending. Picks the
 * USD unit when present, else the first unit.
 */
export async function getCompanyConcept(
  symbol: string,
  concept: string,
  taxonomy = "us-gaap",
): Promise<FilingFigure[]> {
  const cik = await resolveCik(symbol);
  const url = `${XBRL_BASE}/companyconcept/CIK${cik}/${taxonomy}/${concept}.json`;
  const key = `edgar:concept:${cik}:${taxonomy}:${concept}`;
  return cached(key, TTL.filing, async () => {
    const parsed = CompanyConceptSchema.parse(await secFetch(url));
    const unitKey = parsed.units["USD"] ? "USD" : Object.keys(parsed.units)[0];
    const entries = parsed.units[unitKey] ?? [];
    const figures: FilingFigure[] = entries.map((e) =>
      FilingFigureSchema.parse({
        concept: parsed.tag,
        label: parsed.label ?? null,
        unit: unitKey,
        value: e.val,
        periodStart: e.start ?? null,
        periodEnd: e.end,
        fy: e.fy ?? null,
        fp: e.fp ?? null,
        form: e.form ?? null,
        filed: e.filed ?? null,
        accession: e.accn ?? null,
      }),
    );
    return figures.sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  });
}

/** Annual (10-K, FY) values for a concept, most recent last, de-duplicated by fiscal year. */
export async function getAnnualConcept(
  symbol: string,
  concept: string,
  taxonomy = "us-gaap",
): Promise<FilingFigure[]> {
  const all = await getCompanyConcept(symbol, concept, taxonomy);
  const byYear = new Map<string, FilingFigure>();
  for (const f of all) {
    if (f.form !== "10-K" && f.fp !== "FY") continue;
    const yearKey = f.fy != null ? String(f.fy) : f.periodEnd.slice(0, 4);
    byYear.set(yearKey, f);
  }
  return [...byYear.values()].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}

interface StatementLineSpec {
  label: string;
  /** Candidate us-gaap concepts, tried in order (companies tag differently). */
  concepts: string[];
}

const STATEMENT_LINES: Record<StatementKind, StatementLineSpec[]> = {
  income: [
    {
      label: "Revenue",
      concepts: [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "SalesRevenueNet",
      ],
    },
    { label: "Cost of Revenue", concepts: ["CostOfRevenue", "CostOfGoodsAndServicesSold"] },
    { label: "Gross Profit", concepts: ["GrossProfit"] },
    { label: "Operating Income", concepts: ["OperatingIncomeLoss"] },
    { label: "Net Income", concepts: ["NetIncomeLoss", "ProfitLoss"] },
    { label: "Diluted EPS", concepts: ["EarningsPerShareDiluted"] },
  ],
  balance: [
    { label: "Total Assets", concepts: ["Assets"] },
    { label: "Total Liabilities", concepts: ["Liabilities"] },
    {
      label: "Shareholders' Equity",
      concepts: [
        "StockholdersEquity",
        "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
      ],
    },
    { label: "Cash & Equivalents", concepts: ["CashAndCashEquivalentsAtCarryingValue"] },
  ],
  cashflow: [
    { label: "Operating Cash Flow", concepts: ["NetCashProvidedByUsedInOperatingActivities"] },
    { label: "Investing Cash Flow", concepts: ["NetCashProvidedByUsedInInvestingActivities"] },
    { label: "Financing Cash Flow", concepts: ["NetCashProvidedByUsedInFinancingActivities"] },
    { label: "Capital Expenditure", concepts: ["PaymentsToAcquirePropertyPlantAndEquipment"] },
  ],
};

function fiscalYearOf(f: FilingFigure): string {
  return f.fy != null ? String(f.fy) : f.periodEnd.slice(0, 4);
}

/**
 * Assemble an N-year financial statement from EDGAR (A4). Every value is a real
 * reported filing figure; the statement carries a filing SourceRef. Requests run
 * sequentially to stay well under EDGAR's 10 req/s cap; the filing cache (days)
 * makes repeat pulls instant. Values align to fiscal-year columns, oldest first.
 */
export async function getStatement(
  symbol: string,
  kind: StatementKind,
  years = 5,
): Promise<FinancialStatement> {
  const specs = STATEMENT_LINES[kind];
  const collected: { spec: StatementLineSpec; figs: FilingFigure[] }[] = [];

  for (const spec of specs) {
    let figs: FilingFigure[] = [];
    for (const concept of spec.concepts) {
      try {
        const found = await getAnnualConcept(symbol, concept);
        if (found.length) {
          figs = found;
          break;
        }
      } catch (err) {
        if (err instanceof MarketDataError) continue;
        throw err;
      }
    }
    collected.push({ spec, figs });
  }

  const yearSet = new Set<string>();
  for (const { figs } of collected) {
    for (const f of figs) yearSet.add(fiscalYearOf(f));
  }
  const periods = [...yearSet].sort().slice(-Math.min(10, Math.max(1, years)));

  let latestFiled: string | null = null;
  const lines: StatementLine[] = collected.map(({ spec, figs }) => {
    const byYear = new Map<string, number>();
    for (const f of figs) {
      byYear.set(fiscalYearOf(f), f.value);
      if (f.filed && (latestFiled === null || f.filed > latestFiled)) latestFiled = f.filed;
    }
    return {
      concept: spec.concepts[0],
      label: spec.label,
      values: periods.map((y) => byYear.get(y) ?? null),
    };
  });

  return FinancialStatementSchema.parse({
    symbol: normalizeSymbol(symbol),
    kind,
    periods,
    lines,
    source: { kind: "filing", provider: "edgar", asOf: latestFiled ?? undefined },
  });
}

/** Build a SourceRef pointing at a specific filed figure (A10 provenance). */
export function figureSource(symbol: string, f: FilingFigure): SourceRef {
  const sym = normalizeSymbol(symbol);
  return {
    kind: "filing",
    provider: "edgar",
    concept: f.concept,
    accession: f.accession ?? undefined,
    asOf: f.filed ?? f.periodEnd,
    url: f.accession
      ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${sym}&type=${f.form ?? ""}`
      : undefined,
  };
}
