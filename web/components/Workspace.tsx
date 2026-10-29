"use client";

import { useEffect, useRef, useState } from "react";
import GridLayout, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { normalizeSymbol } from "../lib/symbol";
import { useTerminal, type WidgetInstance, type WidgetType } from "../store/terminal";
import QuoteWidget from "./widgets/QuoteWidget";
import ChartWidget from "./widgets/ChartWidget";
import WatchlistWidget from "./widgets/WatchlistWidget";
import NewsWidget from "./widgets/NewsWidget";
import HeatmapWidget from "./widgets/HeatmapWidget";
import ScreenerWidget from "./widgets/ScreenerWidget";
import CryptoWidget from "./widgets/CryptoWidget";
import MacroWidget from "./widgets/MacroWidget";
import OptionsWidget from "./widgets/OptionsWidget";
import PortfolioWidget from "./widgets/PortfolioWidget";
import AiWidget from "./widgets/AiWidget";
import CalendarWidget from "./widgets/CalendarWidget";
import InsiderWidget from "./widgets/InsiderWidget";
import TvWidget from "./widgets/TvWidget";
import RecapWidget from "./widgets/RecapWidget";
import WidgetErrorBoundary from "./WidgetErrorBoundary";

const Grid = WidthProvider(GridLayout);
const TITLES: Record<WidgetType | "dashboard", string> = {
  dashboard: "Market overview", quote: "Quote monitor", chart: "Price chart", watchlist: "Watchlist",
  news: "Market news", heatmap: "Market heatmap", screener: "Equity screener", crypto: "Digital assets",
  macro: "Macro & indexes", options: "Options monitor", portfolio: "Portfolio", ai: "AI research assistant",
  calendar: "Economic calendar", insider: "Insider activity", tv: "Live TV", recap: "Market recap",
};
const SYMBOL_AWARE = ["quote", "chart", "news", "options", "insider"];

function WidgetBody({ widget }: { widget: WidgetInstance }) {
  switch (widget.type) {
    case "quote": return <QuoteWidget widget={widget} />;
    case "chart": return <ChartWidget widget={widget} />;
    case "watchlist": return <WatchlistWidget />;
    case "news": return <NewsWidget widget={widget} />;
    case "heatmap": return <HeatmapWidget />;
    case "screener": return <ScreenerWidget />;
    case "crypto": return <CryptoWidget />;
    case "macro": return <MacroWidget />;
    case "options": return <OptionsWidget widget={widget} />;
    case "portfolio": return <PortfolioWidget />;
    case "ai": return <AiWidget />;
    case "calendar": return <CalendarWidget />;
    case "insider": return <InsiderWidget widget={widget} />;
    case "tv": return <TvWidget />;
    case "recap": return <RecapWidget />;
  }
}

function SymbolTag({ widget, activeSymbol }: { widget: WidgetInstance; activeSymbol: string }) {
  const setWidgetSymbol = useTerminal((s) => s.setWidgetSymbol);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const shown = widget.linked ? activeSymbol : widget.symbol ?? activeSymbol;
  useEffect(() => {
    if (!editing) return;
    setDraft(shown);
    requestAnimationFrame(() => inputRef.current?.select());
  }, [editing, shown]);
  if (editing) return <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value.toUpperCase())} onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => {
    if (e.key === "Enter") { const value = normalizeSymbol(draft); if (value) setWidgetSymbol(widget.id, value); setEditing(false); }
    if (e.key === "Escape") setEditing(false);
  }} onBlur={() => setEditing(false)} className="symbol-edit-input" />;
  return <button type="button" className="symbol-chip" title="Change symbol for this panel" onMouseDown={(e) => e.stopPropagation()} onClick={() => setEditing(true)}>{shown}</button>;
}

function SingleView({ type }: { type: WidgetType }) {
  const activeSymbol = useTerminal((s) => s.activeSymbol);
  const widgets = useTerminal((s) => s.widgets);
  const symbolAware = SYMBOL_AWARE.includes(type);
  const storedWidget = widgets.find((w) => w.type === type);
  const widget: WidgetInstance = storedWidget ?? { id: "view-" + type, type, linked: true };
  const description: Record<WidgetType, string> = {
    chart: "Price action, technical studies and volume",
    quote: "Real-time and reference data for the selected instrument",
    watchlist: "Track your selected instruments in one place",
    news: "Headlines and market-moving developments",
    heatmap: "Compare market performance at a glance",
    screener: "Find instruments using market criteria",
    crypto: "Digital assets and market performance",
    macro: "Rates, indexes and macroeconomic indicators",
    options: "Options chain and derivatives data",
    portfolio: "Positions, exposure and performance",
    ai: "Research and ask questions about markets",
    calendar: "Upcoming economic releases and events",
    insider: "Reported insider transactions",
    tv: "Market video and live coverage",
    recap: "A concise overview of current market activity",
  };
  return (
    <section className={`single-view view-${type}`}>
      <header className="view-heading">
        <div className="view-title-group">
          <div className="view-eyebrow">OPEN TERMINAL <span>/</span> {type.toUpperCase()}</div>
          <h1>{TITLES[type]}</h1>
          <p>{description[type]}</p>
        </div>
        <div className="view-context">
          {symbolAware && <div className="context-symbol"><span className="context-label">SYMBOL</span><SymbolTag widget={widget} activeSymbol={activeSymbol}/></div>}
          <div className="context-live"><span className="status-dot up-bg" /> DATA CONNECTION</div>
        </div>
      </header>
      <div className="single-view-content">
        <WidgetErrorBoundary name={TITLES[type]}><WidgetBody widget={widget} /></WidgetErrorBoundary>
      </div>
    </section>
  );
}

export default function Workspace() {
  const widgets = useTerminal((s) => s.widgets);
  const layout = useTerminal((s) => s.layout);
  const setLayout = useTerminal((s) => s.setLayout);
  const removeWidget = useTerminal((s) => s.removeWidget);
  const toggleLinked = useTerminal((s) => s.toggleLinked);
  const activeSymbol = useTerminal((s) => s.activeSymbol);
  const activeTab = useTerminal((s) => s.activeTab);

  if (activeTab !== "dashboard") return <SingleView type={activeTab} />;

  return (
    <section className="overview-view">
      <header className="view-heading overview-heading">
        <div className="view-title-group"><div className="view-eyebrow">OPEN TERMINAL <span>/</span> WORKSPACE</div><h1>Market overview</h1><p>Your watchlist, price action, headlines and macro data in one workspace.</p></div>
        <div className="overview-badges"><span className="market-pill"><span className="status-dot up-bg"/> WORKSPACE</span><span className="market-pill">{widgets.length} PANELS</span></div>
      </header>
      <Grid className="layout overview-grid" layout={layout} cols={12} rowHeight={34} margin={[7, 7]} draggableHandle=".panel-title" onLayoutChange={(next) => setLayout(next.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })))}>
        {widgets.map((widget) => (
          <div key={widget.id}>
            <div className="terminal-panel">
              <div className="panel-title">
                <span>{TITLES[widget.type]}{SYMBOL_AWARE.includes(widget.type) && <SymbolTag widget={widget} activeSymbol={activeSymbol}/>}</span>
                <span className="panel-actions">
                  {SYMBOL_AWARE.includes(widget.type) && <button title={widget.linked ? "Linked to active symbol (click to unlink)" : "Unlinked (click to link)"} onMouseDown={(e) => e.stopPropagation()} onClick={() => toggleLinked(widget.id)} className={widget.linked ? "link-action selected" : "link-action"}>⛓</button>}
                  <button onMouseDown={(e) => e.stopPropagation()} onClick={() => removeWidget(widget.id)} className="panel-close" title="Remove panel from overview">×</button>
                </span>
              </div>
              <div className="panel-content"><WidgetErrorBoundary name={TITLES[widget.type]}><WidgetBody widget={widget}/></WidgetErrorBoundary></div>
            </div>
          </div>
        ))}
      </Grid>
    </section>
  );
}