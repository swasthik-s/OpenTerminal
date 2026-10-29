"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type View = "settings" | "strategy" | "backtest" | "polymarket";
type PolyMarket = { question?: string; slug?: string; volume24hr?: number | string; volume?: number | string; liquidity?: number | string; outcomePrices?: string; active?: boolean; closed?: boolean; endDate?: string };

const BROKERS = [
  { name: "Alpaca", detail: "Stocks, ETFs & paper trading", method: "API key / OAuth" },
  { name: "Interactive Brokers", detail: "Multi-asset brokerage", method: "TWS / Client Portal gateway" },
  { name: "OANDA", detail: "FX & CFD accounts", method: "Personal access token" },
  { name: "Tradovate", detail: "Futures accounts", method: "OAuth" },
  { name: "MetaTrader 5", detail: "FX, metals & CFD terminals", method: "Bridge / Expert Advisor" },
];

export default function WorkbenchView({ view }: { view: View }) {
  const [brokerNotice, setBrokerNotice] = useState("");
  const [strategyName, setStrategyName] = useState("EMA Pullback");
  const [market, setMarket] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("M15");
  const [trend, setTrend] = useState("EMA 200");
  const [entry, setEntry] = useState("Pullback to EMA 50 + confirmation candle");
  const [stop, setStop] = useState("Swing high / low");
  const [risk, setRisk] = useState("0.5");
  const [rr, setRr] = useState("2");
  const [firm, setFirm] = useState("The5ers");
  const [initialCapital, setInitialCapital] = useState("10000");
  const [dateFrom, setDateFrom] = useState("2025-01-01");
  const [dateTo, setDateTo] = useState("2026-10-29");
  const [engineNotice, setEngineNotice] = useState("");
  const [saved, setSaved] = useState(false);
  const [polySearch, setPolySearch] = useState("");
  const polymarketQuery = useQuery({ queryKey: ["polymarket-public-markets"], queryFn: async () => { const response = await fetch("https://gamma-api.polymarket.com/markets?active=true&closed=false&order=volume_24hr&ascending=false&limit=50"); if (!response.ok) throw new Error("Polymarket API returned HTTP " + response.status); return response.json() as Promise<PolyMarket[]>; }, enabled: view === "polymarket", refetchInterval: 60_000, staleTime: 30_000 });

  const spec = useMemo(() => [
    `Strategy: ${strategyName || "Untitled strategy"}`,
    `Instrument: ${market} · Timeframe: ${timeframe}`,
    `Trend filter: ${trend}`,
    `Entry: ${entry}`,
    `Stop loss: ${stop}`,
    `Risk per trade: ${risk}% · Target: ${rr}R`,
  ].join("\n"), [strategyName, market, timeframe, trend, entry, stop, risk, rr]);

  if (view === "settings") return (
    <section className="workbench-page">
      <div className="workbench-intro"><div className="eyebrow">CONFIGURATION / ACCOUNTS</div><h2>Connections & settings</h2><p>Manage data providers and trading accounts. Credentials must be stored server-side, never in browser storage.</p></div>
      <div className="settings-section"><div className="section-heading"><div><h3>Broker connections</h3><p>Secure account linking and live order routing</p></div><span className="state-badge state-off">0 CONNECTED</span></div>
        <div className="broker-grid">{BROKERS.map((broker) => <article className="broker-card" key={broker.name}><div className="broker-card-top"><div className="broker-logo">{broker.name.slice(0, 2).toUpperCase()}</div><span className="state-badge state-off">NOT LINKED</span></div><h4>{broker.name}</h4><p>{broker.detail}</p><div className="broker-method">{broker.method}</div><button className="workbench-button" onClick={() => setBrokerNotice(`${broker.name}: secure connector is not configured yet. No account was connected and no credentials were collected.`)}>Configure connection <span>↗</span></button></article>)}</div>
        {brokerNotice && <div className="notice-line"><span>INFO</span>{brokerNotice}<button onClick={() => setBrokerNotice("")} aria-label="Dismiss">×</button></div>}
      </div>
      <div className="settings-section"><div className="section-heading"><div><h3>Prediction markets</h3><p>Market discovery and probability monitoring</p></div></div><article className="integration-row"><div><strong>Polymarket</strong><p>Public market data first; wallet trading should remain separately permissioned.</p></div><span className="state-badge state-off">ADAPTER PENDING</span><button className="workbench-button" onClick={() => setBrokerNotice("Polymarket public-data adapter is not configured. No wallet has been connected.")}>Set up</button></article></div>
      <div className="settings-section"><div className="section-heading"><div><h3>Data & security</h3><p>Connection state is explicit; no fake live indicators.</p></div></div><div className="security-note"><span className="security-icon">⌑</span><div><strong>Server-side secrets only</strong><p>API keys, OAuth refresh tokens and broker sessions must be encrypted on the server. Read-only permissions should be the default; order placement requires a separate explicit opt-in.</p></div></div></div>
    </section>
  );

  if (view === "strategy") return (
    <section className="workbench-page">
      <div className="workbench-intro"><div className="eyebrow">STRATEGY LAB / BUILDER</div><h2>Build a trading strategy</h2><p>Define the rules first. Strategy is a draft until it is saved and validated by the execution and backtest services.</p></div>
      <div className="strategy-layout"><div className="strategy-form">
        <label>Strategy name<input value={strategyName} onChange={e => {setStrategyName(e.target.value);setSaved(false);}} /></label>
        <div className="form-grid"><label>Instrument<select value={market} onChange={e => {setMarket(e.target.value);setSaved(false);}}><option>XAUUSD</option><option>EURUSD</option><option>NAS100</option><option>US500</option><option>BTCUSD</option><option>AAPL</option></select></label><label>Timeframe<select value={timeframe} onChange={e => {setTimeframe(e.target.value);setSaved(false);}}>{["M1","M5","M15","M30","H1","H4","D1"].map(x=><option key={x}>{x}</option>)}</select></label></div>
        <label>Trend filter<input value={trend} onChange={e => {setTrend(e.target.value);setSaved(false);}} /></label>
        <label>Entry conditions<textarea rows={3} value={entry} onChange={e => {setEntry(e.target.value);setSaved(false);}} /></label>
        <label>Stop-loss rule<input value={stop} onChange={e => {setStop(e.target.value);setSaved(false);}} /></label>
        <div className="form-grid"><label>Risk per trade (%)<input type="number" min="0.1" max="2" step="0.1" value={risk} onChange={e => {setRisk(e.target.value);setSaved(false);}} /></label><label>Reward / risk (R)<input type="number" min="0.5" max="10" step="0.5" value={rr} onChange={e => {setRr(e.target.value);setSaved(false);}} /></label></div>
        <button className="workbench-button primary" onClick={() => setSaved(true)}>Save draft specification</button>{saved && <div className="notice-line"><span>DRAFT</span> Strategy specification prepared in this session. Persistent storage and executable rules are not connected yet.</div>}
      </div><aside className="strategy-preview"><div className="preview-head"><span>SPECIFICATION PREVIEW</span><span className="state-badge state-warn">DRAFT</span></div><pre>{spec}</pre><div className="preview-divider" /><h4>Validation checklist</h4>{["Unambiguous entry and exit rules","Position sizing and risk limits","Spread, commission and slippage model","Out-of-sample validation","Prop-firm rule checks"].map((x,i)=><div className="check-row" key={x}><span>{String(i+1).padStart(2,"0")}</span>{x}<b>—</b></div>)}</aside></div>
    </section>
  );

  if (view === "backtest") return (
    <section className="workbench-page">
      <div className="workbench-intro"><div className="eyebrow">STRATEGY LAB / BACKTEST</div><h2>Backtest engine</h2><p>Configure a reproducible historical test and evaluate it against a selected prop-firm rule set.</p></div>
      <div className="backtest-config">
        <label>Strategy<select><option>EMA Pullback — draft</option><option>Choose saved strategy…</option></select></label>
        <label>Market<select value={market} onChange={e=>setMarket(e.target.value)}><option>XAUUSD</option><option>EURUSD</option><option>NAS100</option><option>US500</option><option>BTCUSD</option></select></label>
        <label>Timeframe<select value={timeframe} onChange={e=>setTimeframe(e.target.value)}>{["M1","M5","M15","M30","H1","H4","D1"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Initial balance (USD)<input value={initialCapital} onChange={e=>setInitialCapital(e.target.value)} type="number" min="1" /></label>
        <label>Start date<input value={dateFrom} onChange={e=>setDateFrom(e.target.value)} type="date" /></label>
        <label>End date<input value={dateTo} onChange={e=>setDateTo(e.target.value)} type="date" /></label>
        <label className="wide-field">Prop firm rule profile<select value={firm} onChange={e=>setFirm(e.target.value)}>{["The5ers","FTMO","FundingPips","Topstep","Custom rules"].map(x=><option key={x}>{x}</option>)}</select></label>
        <button className="workbench-button primary wide-field" onClick={()=>setEngineNotice("Backtest not started: the historical data, execution simulator and prop-firm rules adapters are not connected. No results have been generated.")}>Run backtest</button>
      </div>
      <div className="engine-empty"><div className="engine-icon">∿</div><h3>Engine services required</h3><p>This screen is configuration only. A reliable backtest needs historical candles, spread/commission/slippage simulation, deterministic fills, and risk-rule enforcement.</p><div className="engine-dependencies"><span>HISTORICAL DATA</span><span>EXECUTION MODEL</span><span>PROP-FIRM RULE FEED</span></div>{engineNotice && <div className="notice-line"><span>NOT RUN</span>{engineNotice}</div>}</div>
      <div className="settings-section"><div className="section-heading"><div><h3>Prop-firm rule profiles</h3><p>Selected profile: {firm}. Rules must be fetched from and timestamped against official provider sources before use.</p></div><span className="state-badge state-warn">NOT VERIFIED</span></div><div className="rule-grid">{[{n:"Daily loss limit",d:"Needs official value and calculation basis"},{n:"Maximum overall loss",d:"Static or trailing drawdown must be identified"},{n:"Profit target",d:"Challenge phase and account size dependent"},{n:"Minimum trading days",d:"Provider and evaluation type dependent"}].map(x=><article className="rule-card" key={x.n}><span>{x.n}</span><strong>—</strong><p>{x.d}</p></article>)}</div></div>
    </section>
  );

  const polyMarkets = (polymarketQuery.data ?? []).filter((item) => (item.question ?? "").toLowerCase().includes(polySearch.toLowerCase()));
  const money = (value?: string | number) => { const n = Number(value ?? 0); return Number.isFinite(n) ? n >= 1_000_000 ? "$" + (n / 1_000_000).toFixed(2) + "M" : n >= 1_000 ? "$" + (n / 1_000).toFixed(1) + "K" : "$" + n.toFixed(0) : "—"; };
  const probability = (value?: string) => { try { const n = Number(JSON.parse(value ?? "[]")[0]); return Number.isFinite(n) ? (n * 100).toFixed(1) + "%" : "—"; } catch { return "—"; } };
  return (
    <section className="workbench-page">
      <div className="workbench-intro"><div className="eyebrow">ALTERNATIVE DATA / PREDICTION MARKETS</div><h2>Polymarket</h2><p>Public market data for event probabilities, liquidity and activity. Trading and wallet access are not enabled here.</p></div>
      <div className="poly-toolbar"><div><span className={`status-dot ${polymarketQuery.isSuccess ? "up-bg" : "idle-bg"}`}/> {polymarketQuery.isSuccess ? "PUBLIC MARKET DATA CONNECTED · REFRESHES EVERY 60S" : polymarketQuery.isLoading ? "CONNECTING TO PUBLIC MARKET DATA…" : "PUBLIC MARKET DATA UNAVAILABLE"}</div><input aria-label="Search prediction markets" placeholder="Filter markets…" value={polySearch} onChange={e=>setPolySearch(e.target.value)} /><button className="workbench-button" onClick={()=>polymarketQuery.refetch()}>Refresh</button></div>
      {polymarketQuery.error && <div className="notice-line"><span>FEED ERROR</span>{(polymarketQuery.error as Error).message}. The API may be unreachable from this browser or deployment.</div>}
      {polymarketQuery.isLoading ? <div className="engine-empty"><div className="engine-icon">↻</div><h3>Loading public markets</h3><p>Fetching active markets from Polymarket's public Gamma API.</p></div> : polyMarkets.length ? <div className="poly-table-wrap"><table className="data-table poly-table"><thead><tr><th>EVENT / MARKET</th><th>TOP OUTCOME</th><th>24H VOLUME</th><th>LIQUIDITY</th><th>END DATE</th><th>LINK</th></tr></thead><tbody>{polyMarkets.map((item,index)=><tr key={item.slug ?? item.question ?? index}><td className="poly-question">{item.question ?? "Untitled market"}</td><td className="amber">{probability(item.outcomePrices)}</td><td>{money(item.volume24hr ?? item.volume)}</td><td>{money(item.liquidity)}</td><td>{item.endDate ? new Date(item.endDate).toLocaleDateString() : "—"}</td><td>{item.slug ? <a href={`https://polymarket.com/event/${encodeURIComponent(item.slug)}`} target="_blank" rel="noreferrer">OPEN ↗</a> : "—"}</td></tr>)}</tbody></table></div> : <div className="engine-empty"><div className="engine-icon">P</div><h3>{polySearch ? "No matching markets" : "No market data returned"}</h3><p>{polySearch ? "Try another search phrase." : "The public market API returned no active markets."}</p></div>}
      <div className="poly-disclaimer">PUBLIC DATA ONLY · No wallet connection, order placement, or investment recommendation. Market data can be delayed or unavailable.</div>
    </section>
  );
}
