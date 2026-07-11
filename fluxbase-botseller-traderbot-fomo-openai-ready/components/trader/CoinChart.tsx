"use client";

import { useEffect, useRef, useState } from "react";

import type { Candle } from "@/lib/trader/types";

export default function CoinChart({
  candles,
  entry,
  exit,
  stopLoss,
  takeProfit,
  currentPrice,
}: {
  candles: Candle[];
  entry?: string | null;
  exit?: string | null;
  stopLoss?: string | null;
  takeProfit?: string | null;
  currentPrice?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let chart: any = null;
    let disposed = false;
    const container = containerRef.current;
    if (!container || !candles.length) return undefined;

    import("lightweight-charts").then((charts) => {
      if (disposed || !containerRef.current) return;
      const chartApi = charts as any;
      chart = chartApi.createChart(containerRef.current, {
        height: expanded ? Math.min(window.innerHeight - 120, 760) : 360,
        layout: { background: { color: "#ffffff" }, textColor: "#091124" },
        grid: { vertLines: { color: "#eef2ff" }, horzLines: { color: "#eef2ff" } },
        rightPriceScale: { borderColor: "#dfe6f2" },
        timeScale: { borderColor: "#dfe6f2", timeVisible: true },
      });
      const candleSeries = chart.addCandlestickSeries
        ? chart.addCandlestickSeries({ upColor: "#16a95f", downColor: "#c0392b", borderVisible: false, wickUpColor: "#16a95f", wickDownColor: "#c0392b" })
        : chart.addSeries(chartApi.CandlestickSeries, { upColor: "#16a95f", downColor: "#c0392b", borderVisible: false, wickUpColor: "#16a95f", wickDownColor: "#c0392b" });
      candleSeries.setData(candles.map((candle) => ({
        time: candle.time,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      })));

      const volumeSeries = chart.addHistogramSeries
        ? chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "" })
        : chart.addSeries(chartApi.HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "" });
      volumeSeries.setData(candles.map((candle) => ({
        time: candle.time,
        value: Number(candle.volume),
        color: Number(candle.close) >= Number(candle.open) ? "rgba(22, 169, 95, 0.3)" : "rgba(192, 57, 43, 0.3)",
      })));
      volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });

      const lines = [
        { price: entry, color: "#3157ff", title: "wejście" },
        { price: exit, color: "#6d4aff", title: "wyjście" },
        { price: stopLoss, color: "#c0392b", title: "stop loss" },
        { price: takeProfit, color: "#16a95f", title: "take profit" },
        { price: currentPrice, color: "#f5aa1c", title: "aktualna cena" },
      ];
      for (const line of lines) {
        const price = Number(line.price);
        if (Number.isFinite(price) && price > 0) {
          candleSeries.createPriceLine({ price, color: line.color, lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: line.title });
        }
      }
      const resizeObserver = new ResizeObserver(() => {
        if (!containerRef.current || !chart) return;
        chart.applyOptions({ width: containerRef.current.clientWidth });
      });
      resizeObserver.observe(containerRef.current);
      chart.timeScale().fitContent();
      return () => resizeObserver.disconnect();
    });

    return () => {
      disposed = true;
      if (chart) chart.remove();
    };
  }, [candles, currentPrice, entry, exit, expanded, stopLoss, takeProfit]);

  if (!candles.length) return <div className="empty-state">Brak świec dla wybranego rynku.</div>;

  return (
    <div className={expanded ? "trader-chart expanded" : "trader-chart"}>
      <div className="trader-chart-toolbar">
        <span>OHLC + wolumen</span>
        <button className="button small" type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Zmniejsz" : "Pełny ekran"}
        </button>
      </div>
      <div ref={containerRef} className="trader-chart-canvas" />
    </div>
  );
}
