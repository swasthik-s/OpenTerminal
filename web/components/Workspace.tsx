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
function WidgetBody({widget}:{widget:WidgetInstance}) {
 switch(widget.type) {
 case "quote": return <QuoteWidget widget={widget}/>;
 case "chart": return <ChartWidget widget={widget}/>;
 case "watchlist": return <WatchlistWidget/>;
 case "news": return <NewsWidget widget={widget}/>;
 case "heatmap": return <HeatmapWidget/>;
 case "screener": return <ScreenerWidget/>;
 case "crypto": return <CryptoWidget/>;
 case "macro": return <MacroWidget/>;
 case "options": return <OptionsWidget widget={widget}/>;
 case "portfolio": return <PortfolioWidget/>;
 case "ai": return <AiWidget/>;
 case "calendar": return <CalendarWidget/>;
 case "insider": return <InsiderWidget widget={widget}/>;
 case "tv": return <TvWidget/>;
 case "recap": return <RecapWidget/>;
 }
}
function SymbolTag({widget,activeSymbol}:{widget:WidgetInstance;activeSymbol:string}) {
 const setWidgetSymbol=useTerminal(s=>s.setWidgetSymbol);
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState("");
 const inputRef=useRef<HTMLInputElement>(null);
 const shown=widget.linked?activeSymbol:widget.symbol??activeSymbol;
 useEffect(()=>{if(!editing)return;setDraft(shown);requestAnimationFrame(()=>inputRef.current?.select());},[editing]);
 if(editing) return <input ref={inputRef} value={draft} onChange={e=>setDraft(e.target.value.toUpperCase())} onMouseDown={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==="Enter"){const v=normalizeSymbol(draft);if(v)setWidgetSymbol(widget.id,v);setEditing(false);}if(e.key==="Escape")setEditing(false);}} onBlur={()=>setEditing(false)} className="ml-2 w-20 !border-0 !border-b !border-[var(--amber-dim)] bg-transparent text-[var(--text)] px-0 py-0 text-[13px] leading-none"/>;
 return <span className="ml-2 text-[var(--text)] cursor-pointer hover:text-[var(--amber)]" title="Click to set this widget's ticker" onMouseDown={e=>e.stopPropagation()} onClick={()=>setEditing(true)}>{shown}</span>;
}
const TITLES:Record<WidgetType|"dashboard",string>={dashboard:"Overview",quote:"Quote",chart:"Chart",watchlist:"Watchlist",news:"News",heatmap:"Heatmap",screener:"Screener",crypto:"Crypto",macro:"Macro / Indexes",options:"Options",portfolio:"Portfolio",ai:"AI Assistant",calendar:"Calendar",insider:"Insider Activity",tv:"Live TV",recap:"Market Recap"};
function SingleView({type}:{type:WidgetType}) {
 const activeSymbol=useTerminal(s=>s.activeSymbol);
 const widget:WidgetInstance={id:"tab-"+type,type,linked:true};
 const symbolAware=new Set<WidgetType>(["quote","chart","news","options","insider"]);
 return <section className="single-view"><div className="single-view-heading"><div><div className="single-view-eyebrow">OPENTERMINAL / WORKSPACE</div><h1>{TITLES[type]}{symbolAware.has(type)&&<SymbolTag widget={widget} activeSymbol={activeSymbol}/>}</h1></div><div className="single-view-symbol"><span className="status-dot up-bg"/> ACTIVE SYMBOL <strong>{activeSymbol}</strong></div></div><div className="single-view-content"><WidgetErrorBoundary name={TITLES[type]}><WidgetBody widget={widget}/></WidgetErrorBoundary></div></section>;
}
export default function Workspace() {
 const widgets=useTerminal(s=>s.widgets),layout=useTerminal(s=>s.layout),setLayout=useTerminal(s=>s.setLayout),removeWidget=useTerminal(s=>s.removeWidget),toggleLinked=useTerminal(s=>s.toggleLinked),activeSymbol=useTerminal(s=>s.activeSymbol),activeTab=useTerminal(s=>s.activeTab),openTabs=useTerminal(s=>s.openTabs),setActiveTab=useTerminal(s=>s.setActiveTab),closeTab=useTerminal(s=>s.closeTab);
 const symbolAware=new Set(["quote","chart","news","options","insider"]);
 return <div className="workspace-shell">
 <div className="workspace-tabs" role="tablist" aria-label="Workspace tabs">
 <button role="tab" aria-selected={activeTab==="dashboard"} onClick={()=>setActiveTab("dashboard")} className={"workspace-tab dashboard-tab "+(activeTab==="dashboard"?"active":"")}><span className="tab-icon">▦</span> Overview</button>
 {openTabs.map(type=><div key={type} role="presentation" className={"workspace-tab-wrap "+(activeTab===type?"active":"")}><button role="tab" aria-selected={activeTab===type} onClick={()=>setActiveTab(type)} className={"workspace-tab "+(activeTab===type?"active":"")}><span className="tab-icon">{type==="chart"?"⌁":type==="quote"?"◉":type==="portfolio"?"▤":"▦"}</span>{TITLES[type]}</button><button className="workspace-tab-close" title={"Close "+TITLES[type]+" tab"} aria-label={"Close "+TITLES[type]+" tab"} onClick={()=>closeTab(type)}>×</button></div>)}
 <div className="workspace-tabs-spacer"/><span className="workspace-tab-hint">WORKSPACE</span></div>
 <div className="workspace-view" key={activeTab}>{activeTab==="dashboard"?<Grid className="layout" layout={layout} cols={12} rowHeight={34} margin={[8,8]} draggableHandle=".panel-title" onLayoutChange={l=>setLayout(l.map(({i,x,y,w,h})=>({i,x,y,w,h})))}>
 {widgets.map(w=><div key={w.id}><div className="terminal-panel"><div className="panel-title"><span>{TITLES[w.type]}{symbolAware.has(w.type)&&<SymbolTag widget={w} activeSymbol={activeSymbol}/>}</span><span className="flex gap-2 items-center">{symbolAware.has(w.type)&&<button title={w.linked?"Linked to active symbol (click to unlink)":"Unlinked (click to link)"} onMouseDown={e=>e.stopPropagation()} onClick={()=>toggleLinked(w.id)} className={w.linked?"text-[var(--amber)]":"dim"}>⛓</button>}<button onMouseDown={e=>e.stopPropagation()} onClick={()=>removeWidget(w.id)} className="dim hover:text-[var(--down)]" title="Remove widget from overview">✕</button></span></div><div className="flex-1 overflow-auto min-h-0"><WidgetErrorBoundary name={TITLES[w.type]}><WidgetBody widget={w}/></WidgetErrorBoundary></div></div></div>)}
 </Grid>:<SingleView type={activeTab}/>}</div></div>;
}
