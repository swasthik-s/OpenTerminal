"use client";

import { useTerminal } from "../store/terminal";

const GROUPS = [
  { label: "MARKETS", items: [
    { type: "chart", title: "Charts", icon: "⌁" },
    { type: "watchlist", title: "Watchlist", icon: "☆" },
    { type: "news", title: "News", icon: "▤" },
    { type: "screener", title: "Screener", icon: "⌕" },
  ]},
  { label: "TRADING LAB", items: [
    { type: "strategy", title: "Strategy builder", icon: "⌘" },
    { type: "backtest", title: "Backtest engine", icon: "∿" },
    { type: "polymarket", title: "Polymarket", icon: "P" },
  ]},
  { label: "ACCOUNT", items: [
    { type: "portfolio", title: "Portfolio", icon: "▥" },
    { type: "settings", title: "Connections & settings", icon: "⚙" },
  ]},
] as const;

export default function Sidebar() {
  const activeTab = useTerminal((s) => s.activeTab);
  const setActiveTab = useTerminal((s) => s.setActiveTab);

  return (
    <aside className="terminal-sidebar">
      <div className="sidebar-heading"><span>WORKSPACE</span><span className="sidebar-live-mark">● LOCAL</span></div>
      <nav className="sidebar-items" aria-label="Main navigation">
        <button onClick={() => setActiveTab("ai")} className={`sidebar-item ${activeTab === "ai" ? "active" : ""}`}>
          <span className="sidebar-icon">✳</span><span className="sidebar-label">AI Terminal</span><span className="sidebar-shortcut">⌘K</span>
        </button>
        {GROUPS.map((group) => (
          <section className="sidebar-nav-group" key={group.label}>
            <div className="sidebar-group">{group.label}</div>
            {group.items.map((item) => (
              <button key={item.type} onClick={() => setActiveTab(item.type)} className={`sidebar-item ${activeTab === item.type ? "active" : ""}`}>
                <span className="sidebar-icon">{item.icon}</span><span className="sidebar-label">{item.title}</span>
              </button>
            ))}
          </section>
        ))}
      </nav>
      <div className="sidebar-footer"><div className="sidebar-version">OPENTERMINAL <span>●</span> WORKSTATION</div></div>
    </aside>
  );
}
