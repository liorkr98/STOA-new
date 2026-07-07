import type { Candle } from "@/lib/market/candle-types";

export interface IndicatorPoint {
  time: number;
  value: number;
}

/** Simple moving average over close prices. */
export function sma(candles: Candle[], period: number): IndicatorPoint[] {
  if (period < 2 || candles.length < period) return [];
  const out: IndicatorPoint[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) {
      out.push({ time: candles[i].time, value: sum / period });
    }
  }
  return out;
}

/** Relative Strength Index (Wilder smoothing). */
export function rsi(candles: Candle[], period = 14): IndicatorPoint[] {
  if (candles.length < period + 1) return [];
  const out: IndicatorPoint[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  const firstIdx = period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  out.push({ time: candles[firstIdx].time, value: 100 - 100 / (1 + rs) });

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsiVal = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    out.push({ time: candles[i].time, value: rsiVal });
  }
  return out;
}
