"use client";

import { useTerminal } from "../store/terminal";
import AppIcon, { type IconName } from "./AppIcon";

const GROUPS: { label: string; items: { type: "chart" | "watchlist" | "news" | "screener" | "strategy" | "backtest" | "polymarket" | "portfolio" | "settings"; title: string; icon: IconName }[] }[] = [
  { label: "MARKETS", items: [
    { type: "chart", title: "Charts", icon: "chart" },
    { type: "watchlist", title: "Watchlist", icon: "star" },
    { type: "news", title: "News & AI", icon: "newspaper" },
    { type: "screener", title: "Screener", icon: "search" },
  ]},
  { label: "TRADING LAB", items: [
    { type: "strategy", title: "Strategy builder", icon: "sliders" },
    { type: "backtest", title: "Backtest engine", icon: "activity" },
    { type: "polymarket", title: "Polymarket", icon: "globe" },
  ]},
  { label: "ACCOUNT", items: [
    { type: "portfolio", title: "Portfolio", icon: "wallet" },
    { type: "settings", title: "Settings & connections", icon: "settings" },
  ]},
];

export default function Sidebar() {
  const activeTab = useTerminal((s) => s.activeTab);
  const setActiveTab = useTerminal((s) => s.setActiveTab);

  return (
    <aside className="terminal-sidebar">
      <div className="sidebar-heading"><span>WORKSPACE</span><span className="sidebar-live-mark">● LOCAL</span></div>
      <nav className="sidebar-items" aria-label="Main navigation">
        <button onClick={() => setActiveTab("ai")} className={"sidebar-item " + (activeTab === "ai" ? "active" : "")}>
          <span className="sidebar-icon"><AppIcon name="sparkles" /></span><span className="sidebar-label">AI Terminal</span><span className="sidebar-shortcut">⌘K</span>
        </button>
        {GROUPS.map((group) => (
          <section className="sidebar-nav-group" key={group.label}>
            <div className="sidebar-group">{group.label}</div>
            {group.items.map((item) => (
              <button key={item.type} onClick={() => setActiveTab(item.type)} className={"sidebar-item " + (activeTab === item.type ? "active" : "")}>
                <span className="sidebar-icon"><AppIcon name={item.icon} /></span><span className="sidebar-label">{item.title}</span>
              </button>
            ))}
          </section>
        ))}
      </nav>
      <div className="sidebar-footer"><div className="sidebar-version">OPENTERMINAL <span>●</span> WORKSTATION</div></div>
    </aside>
  );
}
