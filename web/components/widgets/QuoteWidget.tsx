"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, fmt, fmtBig, pctClass, type Quote } from "../../lib/api";
import { useWidgetSymbol, type WidgetInstance } from "../../store/terminal";
import Flash from "../Flash";

import { usePreferences } from "../../store/preferences";

type ShortVolume = { date: string; shortVolume: number; shortExemptVolume: number; totalVolume: number; shortVolumePercent: number };

export default function QuoteWidget({ widget }: { widget: WidgetInstance }) {
  const refreshSeconds = usePreferences((s) => s.refreshSeconds);
  const symbol = useWidgetSymbol(widget);
  const { data, error } = useQuery({
    queryKey: ["quote", symbol],
    queryFn: async () => (await apiGet<Quote[]>(`/api/quotes?symbols=${encodeURIComponent(symbol)}`))[0],
    refetchInterval: refreshSeconds * 1000,
  });
  // FINRA's Reg SHO file only updates once a day (next-morning), so no point polling it fast.
  const { data: shortVol } = useQuery({
    queryKey: ["short-volume", symbol],
    queryFn: () => apiGet<ShortVolume | null>(`/api/short-volume/${encodeURIComponent(symbol)}`),
    staleTime: 3_600_000,
  });

  if (error) return <div className="p-2 down">Error: {(error as Error).message}</div>;
  if (!data) return <div className="p-2 dim">Loading {symbol}…</div>;

  const rows: Array<[string, string, string?]> = [
    ["Open", fmt(data.open)],
    ["High", fmt(data.high)],
    ["Low", fmt(data.low)],
    ["Prev Close", fmt(data.previousClose)],
    ["Bid", fmt(data.bid)],
    ["Ask", fmt(data.ask)],
    ["Volume", fmtBig(data.volume)],
    ["Avg Vol 3M", fmtBig(data.avgVolume)],
    ...(shortVol ? ([["Short Vol %", fmt(shortVol.shortVolumePercent, 1) + "%"]] as Array<[string, string]>) : []),
    ["Mkt Cap", fmtBig(data.marketCap)],
    ["P/E (ttm)", fmt(data.pe)],
    ["EPS (ttm)", fmt(data.eps)],
    ["Div Yield", data.dividendYield !== null ? fmt(data.dividendYield * 100) + "%" : "—"],
    ["52W High", fmt(data.week52High)],
    ["52W Low", fmt(data.week52Low)],
    ["Beta", fmt(data.beta)],
    ["Shares Out", fmtBig(data.sharesOutstanding)],
  ];

  return (
    <div className="quote-overview">
      <div className="quote-hero">
        <div className="quote-identity">
          <span className="quote-symbol">{symbol}</span>
          <span className="quote-company">{data.name}</span>
        </div>
        <div className="quote-price-line">
          <Flash value={data.price} className="quote-price">{fmt(data.price)}</Flash>
          <Flash value={data.changePercent} className={`quote-change ${pctClass(data.changePercent)}`}>
            {data.change !== null && data.change >= 0 ? "+" : ""}
            {fmt(data.change)} ({fmt(data.changePercent)}%)
          </Flash>
        </div>
        <div className="quote-source">{data.exchange ?? ""} · {data.currency ?? ""} · {data.source}</div>
      </div>
      <div className="quote-metrics">
        {rows.map(([label, value], index) => (
          <div key={label} className={`quote-metric ${index < 4 ? "quote-metric-primary" : ""}`}>
            <span>{label}</span><strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
