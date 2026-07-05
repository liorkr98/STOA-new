import Decimal from "decimal.js";

/**
 * Valuation math (A1/A2). Pure, tested, decimal-safe. Consumed by valuationNode
 * and scenarioNode; the computed result is cached in node attrs at publish
 * (invariant #2). All money math uses decimal.js; callers round only for
 * display. See the stoa-valuation skill.
 */

function D(v: number | string | Decimal): Decimal {
  return v instanceof Decimal ? v : new Decimal(v);
}

// ── DCF ──────────────────────────────────────────────────────────────────────

export type TerminalMethod =
  | { method: "gordon"; growth: number }
  | { method: "exit"; metric: number; multiple: number };

export interface DcfInputs {
  /** Explicit-period free cash flows, oldest first. */
  fcf: number[];
  /** Discount rate as a decimal (0.09 = 9%). */
  wacc: number;
  terminal: TerminalMethod;
  /** Net debt (subtracted from EV). Negative = net cash. */
  netDebt: number;
  dilutedShares: number;
  /** Last price, for the upside figure. Optional. */
  lastPrice?: number | null;
}

export interface DcfResult {
  pvByYear: number[];
  pvTerminal: number;
  terminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  fairValuePerShare: number;
  upside: number | null;
}

export function dcf(inputs: DcfInputs): DcfResult {
  const wacc = D(inputs.wacc);
  if (wacc.lte(-1)) throw new Error("WACC must be greater than -100%");
  if (inputs.dilutedShares <= 0) throw new Error("dilutedShares must be positive");

  const onePlusW = wacc.plus(1);
  const pvByYear: Decimal[] = inputs.fcf.map((cf, i) => D(cf).div(onePlusW.pow(i + 1)));
  const n = inputs.fcf.length;

  let terminalValue: Decimal;
  if (inputs.terminal.method === "gordon") {
    const g = D(inputs.terminal.growth);
    if (wacc.lte(g)) throw new Error("WACC must exceed terminal growth for the Gordon model");
    const lastFcf = D(inputs.fcf[n - 1] ?? 0);
    terminalValue = lastFcf.times(g.plus(1)).div(wacc.minus(g));
  } else {
    terminalValue = D(inputs.terminal.metric).times(inputs.terminal.multiple);
  }
  const pvTerminal = n > 0 ? terminalValue.div(onePlusW.pow(n)) : terminalValue;

  const sumPv = pvByYear.reduce((a, b) => a.plus(b), new Decimal(0));
  const enterpriseValue = sumPv.plus(pvTerminal);
  const equityValue = enterpriseValue.minus(inputs.netDebt);
  const fairValuePerShare = equityValue.div(inputs.dilutedShares);

  const upside =
    inputs.lastPrice && inputs.lastPrice > 0
      ? fairValuePerShare.div(inputs.lastPrice).minus(1).toNumber()
      : null;

  return {
    pvByYear: pvByYear.map((d) => d.toNumber()),
    pvTerminal: pvTerminal.toNumber(),
    terminalValue: terminalValue.toNumber(),
    enterpriseValue: enterpriseValue.toNumber(),
    equityValue: equityValue.toNumber(),
    fairValuePerShare: fairValuePerShare.toNumber(),
    upside,
  };
}

/**
 * 5x5 sensitivity grid of fair value per share over WACC (rows) x terminal
 * growth (cols). Only valid for the Gordon terminal method.
 */
export function dcfSensitivity(
  inputs: DcfInputs,
  waccSteps: number[],
  growthSteps: number[],
): number[][] {
  return waccSteps.map((w) =>
    growthSteps.map((g) => {
      try {
        return dcf({ ...inputs, wacc: w, terminal: { method: "gordon", growth: g } })
          .fairValuePerShare;
      } catch {
        return NaN;
      }
    }),
  );
}

// ── Multiples ────────────────────────────────────────────────────────────────

export interface MultiplesInputs {
  /** Per-share metric (e.g. EPS for P/E, or per-share EBITDA bridged to equity). */
  metricPerShare: number;
  peerMultiple: number;
  lastPrice?: number | null;
}

export function multiplesValuation(inputs: MultiplesInputs): {
  impliedPrice: number;
  upside: number | null;
} {
  const impliedPrice = D(inputs.metricPerShare).times(inputs.peerMultiple);
  const upside =
    inputs.lastPrice && inputs.lastPrice > 0
      ? impliedPrice.div(inputs.lastPrice).minus(1).toNumber()
      : null;
  return { impliedPrice: impliedPrice.toNumber(), upside };
}

// ── Dividend discount (Gordon growth) ────────────────────────────────────────

export interface DdmInputs {
  /** Next-period dividend per share. */
  dividend: number;
  /** Required return as a decimal. */
  requiredReturn: number;
  growth: number;
  lastPrice?: number | null;
}

export function ddm(inputs: DdmInputs): { value: number; upside: number | null } {
  const r = D(inputs.requiredReturn);
  const g = D(inputs.growth);
  if (r.lte(g)) throw new Error("Required return must exceed dividend growth");
  const value = D(inputs.dividend).div(r.minus(g));
  const upside =
    inputs.lastPrice && inputs.lastPrice > 0
      ? value.div(inputs.lastPrice).minus(1).toNumber()
      : null;
  return { value: value.toNumber(), upside };
}

// ── Scenario (A2) ────────────────────────────────────────────────────────────

export interface ScenarioCase {
  label: string;
  price: number;
  /** Probability in percent (bull + base + bear must total 100). */
  probability: number;
}

export interface ScenarioResult {
  weightedTarget: number;
  expectedUpside: number | null;
  probabilityTotal: number;
  valid: boolean;
}

export function scenario(cases: ScenarioCase[], lastPrice?: number | null): ScenarioResult {
  const total = cases.reduce((a, c) => a.plus(c.probability), new Decimal(0));
  const valid = total.eq(100);
  const weighted = cases.reduce(
    (a, c) => a.plus(D(c.price).times(D(c.probability).div(100))),
    new Decimal(0),
  );
  const expectedUpside =
    lastPrice && lastPrice > 0 ? weighted.div(lastPrice).minus(1).toNumber() : null;
  return {
    weightedTarget: weighted.toNumber(),
    expectedUpside,
    probabilityTotal: total.toNumber(),
    valid,
  };
}
