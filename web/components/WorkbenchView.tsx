"use client";

import { useMemo, useState } from "react";

type View = "settings" | "strategy" | "backtest" | "polymarket";

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
  const [polyNotice, setPolyNotice] = useState("");
  const [saved, setSaved] = useState(false);

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

  return (
    <section className="workbench-page">
      <div className="workbench-intro"><div className="eyebrow">ALTERNATIVE DATA / PREDICTION MARKETS</div><h2>Polymarket</h2><p>Explore event probabilities alongside traditional market research.</p></div>
      <div className="poly-toolbar"><div><span className="status-dot idle-bg"/> PUBLIC MARKET DATA NOT CONNECTED</div><button className="workbench-button" onClick={()=>setPolyNotice("Polymarket market-data adapter is not configured. This page does not display live markets or submit orders.")}>Check connection</button></div>
      <div className="poly-empty"><div className="poly-mark">P</div><h3>Prediction market feed</h3><p>Connect a public market-data adapter to show event markets, implied probabilities, liquidity, volume and price history. Wallets and order execution should be a separate, explicit setup.</p><div className="poly-features"><div><span>01</span><strong>Event discovery</strong><p>Search by topic, close date and liquidity.</p></div><div><span>02</span><strong>Probability monitor</strong><p>Track probability moves and unusual volume.</p></div><div><span>03</span><strong>Risk controls</strong><p>Keep market-data access separate from wallet permissions.</p></div></div>{polyNotice && <div className="notice-line"><span>STATUS</span>{polyNotice}</div>}</div>
    </section>
  );
}
