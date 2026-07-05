import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dcf, ddm, multiplesValuation, scenario } from "./model";

function close(a: number, b: number, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);
}

describe("dcf", () => {
  it("matches a hand-worked Gordon example", () => {
    // FCF 100, WACC 10%, terminal growth 0 -> TV = 100/0.10 = 1000.
    // PV(FCF1) = 90.909..., PV(TV) = 1000/1.1 = 909.09..., EV = 1000.
    const r = dcf({
      fcf: [100],
      wacc: 0.1,
      terminal: { method: "gordon", growth: 0 },
      netDebt: 0,
      dilutedShares: 10,
    });
    close(r.enterpriseValue, 1000);
    close(r.fairValuePerShare, 100);
    assert.equal(r.upside, null);
  });

  it("subtracts net debt and computes upside", () => {
    const r = dcf({
      fcf: [100],
      wacc: 0.1,
      terminal: { method: "gordon", growth: 0 },
      netDebt: 200,
      dilutedShares: 10,
      lastPrice: 40,
    });
    close(r.equityValue, 800);
    close(r.fairValuePerShare, 80);
    close(r.upside as number, 1); // 80 vs 40 = +100%
  });

  it("supports the exit-multiple terminal method", () => {
    const r = dcf({
      fcf: [0],
      wacc: 0.1,
      terminal: { method: "exit", metric: 100, multiple: 10 },
      netDebt: 0,
      dilutedShares: 10,
    });
    close(r.terminalValue, 1000);
    close(r.fairValuePerShare, 1000 / 1.1 / 10);
  });

  it("rejects WACC <= growth for the Gordon model", () => {
    assert.throws(() =>
      dcf({
        fcf: [100],
        wacc: 0.05,
        terminal: { method: "gordon", growth: 0.08 },
        netDebt: 0,
        dilutedShares: 10,
      }),
    );
  });

  it("rejects non-positive shares", () => {
    assert.throws(() =>
      dcf({ fcf: [100], wacc: 0.1, terminal: { method: "gordon", growth: 0 }, netDebt: 0, dilutedShares: 0 }),
    );
  });
});

describe("scenario", () => {
  it("computes a probability-weighted target", () => {
    const r = scenario(
      [
        { label: "Bull", price: 150, probability: 25 },
        { label: "Base", price: 100, probability: 50 },
        { label: "Bear", price: 60, probability: 25 },
      ],
      100,
    );
    close(r.weightedTarget, 102.5);
    close(r.expectedUpside as number, 0.025);
    assert.equal(r.valid, true);
  });

  it("flags probabilities that do not total 100", () => {
    const r = scenario([
      { label: "Bull", price: 150, probability: 40 },
      { label: "Bear", price: 60, probability: 40 },
    ]);
    assert.equal(r.valid, false);
    assert.equal(r.probabilityTotal, 80);
  });
});

describe("multiples + ddm", () => {
  it("implies a price from a peer multiple", () => {
    const r = multiplesValuation({ metricPerShare: 5, peerMultiple: 20, lastPrice: 50 });
    close(r.impliedPrice, 100);
    close(r.upside as number, 1);
  });

  it("values a growing dividend", () => {
    const r = ddm({ dividend: 2, requiredReturn: 0.1, growth: 0.04 });
    close(r.value, 2 / 0.06);
  });

  it("rejects DDM when required return <= growth", () => {
    assert.throws(() => ddm({ dividend: 2, requiredReturn: 0.04, growth: 0.05 }));
  });
});
