import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { LineSeries, type UTCTimestamp } from "lightweight-charts";
import type { Candle } from "@/lib/market/candle-types";
import type { ChartIndicator } from "@/lib/market/chart-indicators";
import { rsi, sma } from "@/lib/market/indicators";

export interface IndicatorHandles {
  overlay: ISeriesApi<"Line">[];
  rsiPane: ReturnType<IChartApi["addPane"]> | null;
  rsiSeries: ISeriesApi<"Line"> | null;
}

export function createIndicatorHandles(): IndicatorHandles {
  return { overlay: [], rsiPane: null, rsiSeries: null };
}

export function clearIndicatorHandles(chart: IChartApi, handles: IndicatorHandles) {
  for (const s of handles.overlay) chart.removeSeries(s);
  handles.overlay = [];
  if (handles.rsiSeries) {
    chart.removeSeries(handles.rsiSeries);
    handles.rsiSeries = null;
  }
  if (handles.rsiPane) {
    chart.removePane(handles.rsiPane.paneIndex());
    handles.rsiPane = null;
  }
}

const SMA_COLORS = ["var(--brass)", "var(--plum)", "var(--verdigris)"];

function cssVar(name: string): string {
  if (typeof document === "undefined") return name;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || name;
}

/** Apply SMA overlays and RSI sub-pane from chartNode indicator attrs. */
export function applyChartIndicators(
  chart: IChartApi,
  candles: Candle[],
  indicators: ChartIndicator[],
  handles: IndicatorHandles,
) {
  clearIndicatorHandles(chart, handles);

  let smaIdx = 0;
  for (const ind of indicators) {
    if (ind.type === "sma") {
      const data = sma(candles, ind.period);
      if (!data.length) continue;
      const color = cssVar(SMA_COLORS[smaIdx % SMA_COLORS.length]);
      smaIdx++;
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        lastValueVisible: true,
        priceLineVisible: false,
        title: `SMA ${ind.period}`,
      });
      series.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })));
      handles.overlay.push(series);
    }
  }

  const rsiInd = indicators.find((i) => i.type === "rsi");
  if (rsiInd) {
    const data = rsi(candles, rsiInd.period);
    if (data.length) {
      const pane = chart.addPane();
      pane.setHeight(72);
      const series = pane.addSeries(LineSeries, {
        color: cssVar("--brass"),
        lineWidth: 2,
        lastValueVisible: true,
        priceLineVisible: false,
        title: `RSI ${rsiInd.period}`,
      });
      series.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })));
      series.createPriceLine({ price: 70, color: cssVar("--text-faint"), lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      series.createPriceLine({ price: 30, color: cssVar("--text-faint"), lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      handles.rsiPane = pane;
      handles.rsiSeries = series;
    }
  }
}
