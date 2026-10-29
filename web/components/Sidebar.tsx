"use client";

import { useTerminal, type WidgetType } from "../store/terminal";

const GROUPS: Array<{ label: string; items: Array<{ type: WidgetType; title: string; icon: string; shortcut?: string }> }> = [
  { label: "MONITOR", items: [
    { type: "chart", title: "Chart", icon: "⌁", shortcut: "Alt 1" },
    { type: "quote", title: "Quote", icon: "◉", shortcut: "Alt 2" },
    { type: "watchlist", title: "Watchlist", icon: "☆" },
  ]},
  { label: "MARKETS", items: [
    { type: "screener", title: "Equity screener", icon: "☷", shortcut: "Alt 4" },
    { type: "heatmap", title: "Market heatmap", icon: "▦", shortcut: "Alt 5" },
    { type: "crypto", title: "Digital assets", icon: "₿", shortcut: "Alt 6" },
    { type: "macro", title: "Macro & indexes", icon: "⌇" },
    { type: "options", title: "Options", icon: "⌘", shortcut: "Alt 7" },
  ]},
  { label: "PORTFOLIO", items: [
    { type: "portfolio", title: "Portfolio", icon: "▤", shortcut: "Alt 8" },
    { type: "insider", title: "Insider activity", icon: "↗" },
  ]},
  { label: "NEWS & RESEARCH", items: [
    { type: "news", title: "News", icon: "▤", shortcut: "Alt 3" },
    { type: "calendar", title: "Economic calendar", icon: "▦" },
    { type: "recap", title: "Market recap", icon: "◷" },
  ]},
  { label: "TOOLS", items: [
    { type: "ai", title: "AI research assistant", icon: "✳", shortcut: "Alt 9" },
    { type: "tv", title: "Live TV", icon: "▷" },
  ]},
];

export default function Sidebar() {
  const activeTab = useTerminal((s) => s.activeTab);
  const setActiveTab = useTerminal((s) => s.setActiveTab);
  const resetWorkspace = useTerminal((s) => s.resetWorkspace);

  return (
    <aside className="terminal-sidebar">
      <div className="sidebar-heading"><span>WORKSPACE</span><span className="sidebar-live-mark">● LIVE</span></div>
      <nav className="sidebar-items" aria-label="Terminal navigation">
        <button onClick={() => setActiveTab("dashboard")} className={`sidebar-item sidebar-overview ${activeTab === "dashboard" ? "active" : ""}`}>
          <span className="sidebar-icon">▦</span><span className="sidebar-label">Overview</span>
        </button>
        {GROUPS.map((group) => (
          <section className="sidebar-nav-group" key={group.label}>
            <div className="sidebar-group">{group.label}</div>
            {group.items.map((item) => (
              <button key={item.type} onClick={() => setActiveTab(item.type)} className={`sidebar-item ${activeTab === item.type ? "active" : ""}`} title={item.shortcut ? `${item.title} · ${item.shortcut}` : item.title}>
                <span className="sidebar-icon">{item.icon}</span><span className="sidebar-label">{item.title}</span>{item.shortcut && <span className="sidebar-shortcut">{item.shortcut.replace("Alt ", "⌥")}</span>}
              </button>
            ))}
          </section>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button onClick={resetWorkspace} className="reset-layout"><span>↺</span><span>Reset workspace</span></button>
        <div className="sidebar-version">OPENTERMINAL <span>●</span> MARKET WORKSTATION</div>
      </div>
    </aside>
  );
}