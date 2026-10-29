"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../lib/api";
import { usePreferences } from "../store/preferences";
import AppIcon from "./AppIcon";

type View = "settings" | "strategy" | "backtest" | "polymarket";
type Integration = { id: string; label: string; configured: boolean; mode: string; detail: string };
type RssFeed = { id:number; url:string; label:string; enabled:number; createdAt:string };
type PolyMarket = { question?: string; slug?: string; volume24hr?: number | string; volume_24hr?: number | string; volume?: number | string; liquidity?: number | string; outcomePrices?: string; outcome_prices?: string; active?: boolean; closed?: boolean; endDate?: string; end_date?: string };

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
  const [rssUrl, setRssUrl] = useState("");
  const [rssLabel, setRssLabel] = useState("");
  const [rssNotice, setRssNotice] = useState("");
  const [rssBusy, setRssBusy] = useState(false);
  const [alpacaTest, setAlpacaTest] = useState<{loading:boolean; message:string; ok?:boolean}>({loading:false,message:""});
  const [aiTest, setAiTest] = useState<{loading:boolean; message:string; ok?:boolean}>({loading:false,message:""});
  const fontScale = usePreferences((s) => s.fontScale);
  const setFontScale = usePreferences((s) => s.setFontScale);
  const density = usePreferences((s) => s.density);
  const setDensity = usePreferences((s) => s.setDensity);
  const animations = usePreferences((s) => s.animations);
  const setAnimations = usePreferences((s) => s.setAnimations);
  const refreshSeconds = usePreferences((s) => s.refreshSeconds);
  const setRefreshSeconds = usePreferences((s) => s.setRefreshSeconds);
  const startView = usePreferences((s) => s.startView);
  const setStartView = usePreferences((s) => s.setStartView);
  const resetPreferences = usePreferences((s) => s.resetPreferences);
  const integrationsQuery = useQuery({ queryKey: ["integration-status"], queryFn: () => apiGet<{checkedAt:string; integrations:Integration[]}>("/api/integrations/status"), enabled: view === "settings", refetchInterval: refreshSeconds * 1000 });
  const rssQuery = useQuery({ queryKey: ["rss-feeds"], queryFn: () => apiGet<RssFeed[]>("/api/integrations/rss-feeds"), enabled: view === "settings" });
  const addRssFeed = async (event: FormEvent) => { event.preventDefault(); if (!rssUrl.trim()) return; setRssBusy(true); setRssNotice(""); try { await apiPost("/api/integrations/rss-feeds", { url: rssUrl.trim(), label: rssLabel.trim() || undefined }); setRssUrl(""); setRssLabel(""); setRssNotice("Feed validated and saved. It will appear in news results."); await Promise.all([rssQuery.refetch(), integrationsQuery.refetch()]); } catch (error) { setRssNotice((error as Error).message); } finally { setRssBusy(false); } };
  const removeRssFeed = async (id:number) => { try { await apiDelete("/api/integrations/rss-feeds/" + id); await Promise.all([rssQuery.refetch(), integrationsQuery.refetch()]); setRssNotice("RSS feed removed."); } catch (error) { setRssNotice((error as Error).message); } };
  const polymarketQuery = useQuery({ queryKey: ["polymarket-public-markets"], queryFn: () => apiGet<{fetchedAt:string; count:number; markets:PolyMarket[]}>("/api/polymarket/markets"), enabled: view === "polymarket", refetchInterval: 60_000, staleTime: 30_000 });
  const runAiTest = async () => { setAiTest({loading:true,message:"Testing AI provider credentials…"}); try { const result = await apiPost<{ok:boolean;model?:string;response?:string}>("/api/integrations/ai/test",{}); setAiTest({loading:false,ok:result.ok,message:result.ok ? "AI handshake succeeded · " + (result.model ?? "model") + " replied: " + (result.response ?? "OK") : "AI connection failed"}); } catch (error) { setAiTest({loading:false,ok:false,message:(error as Error).message}); } };
  const runAlpacaTest = async () => { setAlpacaTest({loading:true,message:"Checking server-side Alpaca credentials…"}); try { const result = await apiPost<{ok:boolean;paper:boolean;account?:{id?:string;status?:string;currency?:string;tradingBlocked?:boolean};error?:string}>("/api/integrations/alpaca/test",{}); setAlpacaTest({loading:false,ok:result.ok,message:result.ok ? "Account handshake succeeded · " + (result.paper ? "PAPER" : "LIVE") + " · " + (result.account?.status ?? "status unknown") + " · " + (result.account?.currency ?? "currency unknown") : "Connection failed"}); } catch (error) { setAlpacaTest({loading:false,ok:false,message:(error as Error).message}); } };

  const spec = useMemo(() => [
    `Strategy: ${strategyName || "Untitled strategy"}`,
    `Instrument: ${market} · Timeframe: ${timeframe}`,
    `Trend filter: ${trend}`,
    `Entry: ${entry}`,
    `Stop loss: ${stop}`,
    `Risk per trade: ${risk}% · Target: ${rr}R`,
  ].join("\n"), [strategyName, market, timeframe, trend, entry, stop, risk, rr]);

  if (view === "settings") {
    const integrations = integrationsQuery.data?.integrations ?? [];
    const readyCount = integrations.filter((item) => item.configured).length;
    return (
      <section className="workbench-page">
        <div className="workbench-intro"><div className="eyebrow">SYSTEM / PREFERENCES & CONNECTIONS</div><h2>Settings</h2><p>Control the terminal experience and monitor server-side integrations. Credentials are never saved in browser storage.</p></div>
        <div className="settings-section">
          <div className="section-heading"><div><h3><AppIcon name="sliders" size={16}/> Appearance & workspace</h3><p>Preferences are saved locally and applied throughout the app.</p></div><button className="workbench-button" onClick={resetPreferences}>Reset preferences</button></div>
          <div className="preferences-grid">
            <div className="preference-card"><div className="preference-label"><span>Interface font size</span><strong>{Math.round(fontScale*100)}%</strong></div><input aria-label="Interface font size" type="range" min="0.9" max="1.3" step="0.05" value={fontScale} onChange={e=>setFontScale(Number(e.target.value))}/><div className="preference-hints"><span>Compact</span><span>Large</span></div></div>
            <div className="preference-card"><label htmlFor="density-setting">Layout spacing</label><select id="density-setting" value={density} onChange={e=>setDensity(e.target.value as "comfortable"|"compact")}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select><p>Adjust navigation, rows and panel padding.</p></div>
            <div className="preference-card"><label htmlFor="refresh-setting">Market refresh interval</label><select id="refresh-setting" value={refreshSeconds} onChange={e=>setRefreshSeconds(Number(e.target.value) as 15|30|60)}><option value="15">15 seconds</option><option value="30">30 seconds</option><option value="60">60 seconds</option></select><p>Polling interval preference.</p></div>
            <div className="preference-card"><label htmlFor="start-view-setting">Startup workspace</label><select id="start-view-setting" value={startView} onChange={e=>setStartView(e.target.value as "ai"|"chart"|"news"|"watchlist"|"settings")}><option value="ai">AI Terminal</option><option value="chart">Charts</option><option value="news">News & AI</option><option value="watchlist">Watchlist</option><option value="settings">Settings</option></select><p>Used when the app next opens.</p></div>
            <div className="preference-card preference-toggle"><div><strong>Motion & transitions</strong><p>Use subtle fades and hover transitions.</p></div><button className={"switch-button " + (animations ? "enabled" : "")} role="switch" aria-checked={animations} onClick={()=>setAnimations(!animations)}><span/></button></div>
            <div className="preference-card preference-toggle"><div><strong>Color profile</strong><p>Pure black · terminal amber · market states.</p></div><span className="state-badge state-warn">BLACK / AMBER</span></div>
          </div>
        </div>
        <div className="settings-section">
          <div className="section-heading"><div><h3><AppIcon name="plug" size={16}/> Integration health</h3><p>Configured means server settings exist; connected means a real provider handshake succeeded.</p></div><div className="integration-actions"><span className="state-badge state-off">{readyCount} CONFIGURED</span><button className="workbench-button" onClick={()=>integrationsQuery.refetch()}><AppIcon name="refresh" size={14}/> Refresh</button></div></div>
          {integrationsQuery.isLoading && <div className="integration-loading">Checking API server configuration…</div>}
          {integrationsQuery.error && <div className="notice-line"><span>API ERROR</span>{(integrationsQuery.error as Error).message}. Check API_URL and the shared API_KEY configuration.</div>}
          <div className="integration-list">{integrations.map((item)=> <article className="integration-card" key={item.id}><div className="integration-icon"><AppIcon name={item.id==="ai"?"brain":item.id==="rss"?"rss":item.id==="polymarket"?"globe":item.id==="alpaca"?"activity":"plug"} size={19}/></div><div className="integration-copy"><strong>{item.label}</strong><p>{item.detail}</p></div><span className={"state-badge " + (item.configured ? "state-warn" : "state-off")}>{item.configured ? (item.id==="polymarket" ? "PUBLIC DATA" : "CONFIGURED") : "NOT CONFIGURED"}</span>{item.id==="alpaca" && item.configured && <button className="workbench-button" disabled={alpacaTest.loading} onClick={runAlpacaTest}>{alpacaTest.loading?"Testing…":"Test account"}</button>}{item.id==="ai" && item.configured && <button className="workbench-button" disabled={aiTest.loading} onClick={runAiTest}>{aiTest.loading?"Testing…":"Test API"}</button>}</article>)}</div>
          {aiTest.message && <div className="notice-line"><span>{aiTest.loading?"TESTING":aiTest.ok?"AI OK":"AI FAILED"}</span>{aiTest.message}</div>}{alpacaTest.message && <div className="notice-line"><span>{alpacaTest.loading?"TESTING":alpacaTest.ok?"CONNECTED":"FAILED"}</span>{alpacaTest.message}</div>}
          <div className="security-note"><span className="security-icon"><AppIcon name="shield" size={22}/></span><div><strong>Secrets stay on the API server</strong><p>Set provider credentials as environment variables in the server deployment. Never paste private broker keys into a frontend form. Use read-only keys by default; live order execution must be separately permissioned and tested.</p></div></div>
        </div>
        <div className="settings-section">
          <div className="section-heading"><div><h3><AppIcon name="rss" size={16}/> RSS / Atom feeds</h3><p>Add trusted HTTPS feeds; the API validates the URL and parses the feed before saving it.</p></div><span className="state-badge state-off">{rssQuery.data?.length ?? 0} SAVED</span></div>
          <form className="rss-add-form" onSubmit={addRssFeed}><label>Feed URL<input type="url" required value={rssUrl} onChange={e=>setRssUrl(e.target.value)} placeholder="https://example.com/market-news.xml"/></label><label>Display name<input value={rssLabel} onChange={e=>setRssLabel(e.target.value)} placeholder="Optional publisher name"/></label><button className="workbench-button primary" type="submit" disabled={rssBusy}>{rssBusy?"Validating…":"Validate & add feed"}</button></form>
          {rssNotice && <div className="notice-line"><span>RSS</span>{rssNotice}</div>}
          {rssQuery.error && <div className="notice-line"><span>ERROR</span>{(rssQuery.error as Error).message}</div>}
          <div className="rss-feed-list">{(rssQuery.data ?? []).map(feed=><article className="rss-feed-row" key={feed.id}><div className="rss-feed-icon"><AppIcon name="rss" size={16}/></div><div className="rss-feed-copy"><strong>{feed.label}</strong><span>{feed.url}</span></div><span className="state-badge state-warn">SAVED</span><button className="workbench-button" onClick={()=>removeRssFeed(feed.id)}><AppIcon name="x" size={13}/> Remove</button></article>)}</div>
          <p className="rss-security-note">Only HTTPS URLs on public hosts are accepted. Feed content is treated as untrusted data and is never executed.</p>
        </div>
        <div className="settings-section">
          <div className="section-heading"><div><h3><AppIcon name="server" size={16}/> Connection setup</h3><p>Server-side variables used by the current integration adapters.</p></div></div>
          <div className="setup-grid"><article><strong>AI API</strong><code>ANTHROPIC_API_KEY</code><p>Set in the API service environment. The UI never sees the key.</p></article><article><strong>Alpaca</strong><code>ALPACA_API_KEY</code><code>ALPACA_SECRET_KEY</code><code>ALPACA_PAPER=true</code><p>Paper mode is the default unless explicitly set to false.</p></article><article><strong>RSS / Atom</strong><code>RSS_FEEDS</code><p>Comma-separated trusted feed URLs; feed validation and fetching happen server-side.</p></article><article><strong>Other brokers</strong><code>OAuth / gateway adapter</code><p>IBKR, OANDA, Tradovate and MT5 require provider-specific authentication and session handling before they can be marked connected.</p></article></div>
        </div>
      </section>
    );
  }

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

  const polyMarkets = (polymarketQuery.data?.markets ?? []).filter((item) => (item.question ?? "").toLowerCase().includes(polySearch.toLowerCase()));
  const money = (value?: string | number) => { const n = Number(value ?? 0); return Number.isFinite(n) ? n >= 1_000_000 ? "$" + (n / 1_000_000).toFixed(2) + "M" : n >= 1_000 ? "$" + (n / 1_000).toFixed(1) + "K" : "$" + n.toFixed(0) : "—"; };
  const probability = (value?: string) => { try { const n = Number(JSON.parse(value ?? "[]")[0]); return Number.isFinite(n) ? (n * 100).toFixed(1) + "%" : "—"; } catch { return "—"; } };
  return (
    <section className="workbench-page">
      <div className="workbench-intro"><div className="eyebrow">ALTERNATIVE DATA / PREDICTION MARKETS</div><h2>Polymarket</h2><p>Public market data for event probabilities, liquidity and activity. Trading and wallet access are not enabled here.</p></div>
      <div className="poly-toolbar"><div><span className={`status-dot ${polymarketQuery.isSuccess ? "up-bg" : "idle-bg"}`}/> {polymarketQuery.isSuccess ? "PUBLIC MARKET DATA CONNECTED · REFRESHES EVERY 60S" : polymarketQuery.isLoading ? "CONNECTING TO PUBLIC MARKET DATA…" : "PUBLIC MARKET DATA UNAVAILABLE"}</div><input aria-label="Search prediction markets" placeholder="Filter markets…" value={polySearch} onChange={e=>setPolySearch(e.target.value)} /><button className="workbench-button" onClick={()=>polymarketQuery.refetch()}>Refresh</button></div>
      {polymarketQuery.error && <div className="notice-line"><span>FEED ERROR</span>{(polymarketQuery.error as Error).message}. The API may be unreachable from this browser or deployment.</div>}
      {polymarketQuery.isLoading ? <div className="engine-empty"><div className="engine-icon">↻</div><h3>Loading public markets</h3><p>Fetching active markets from Polymarket's public Gamma API.</p></div> : polyMarkets.length ? <div className="poly-table-wrap"><table className="data-table poly-table"><thead><tr><th>EVENT / MARKET</th><th>TOP OUTCOME</th><th>24H VOLUME</th><th>LIQUIDITY</th><th>END DATE</th><th>LINK</th></tr></thead><tbody>{polyMarkets.map((item,index)=><tr key={item.slug ?? item.question ?? index}><td className="poly-question">{item.question ?? "Untitled market"}</td><td className="amber">{probability(item.outcomePrices ?? item.outcome_prices)}</td><td>{money(item.volume24hr ?? item.volume_24hr ?? item.volume)}</td><td>{money(item.liquidity)}</td><td>{(item.endDate ?? item.end_date) ? new Date((item.endDate ?? item.end_date)!).toLocaleDateString() : "—"}</td><td>{item.slug ? <a href={`https://polymarket.com/event/${encodeURIComponent(item.slug)}`} target="_blank" rel="noreferrer">OPEN ↗</a> : "—"}</td></tr>)}</tbody></table></div> : <div className="engine-empty"><div className="engine-icon">P</div><h3>{polySearch ? "No matching markets" : "No market data returned"}</h3><p>{polySearch ? "Try another search phrase." : "The public market API returned no active markets."}</p></div>}
      <div className="poly-disclaimer">PUBLIC DATA ONLY · No wallet connection, order placement, or investment recommendation. Market data can be delayed or unavailable.</div>
    </section>
  );
}
