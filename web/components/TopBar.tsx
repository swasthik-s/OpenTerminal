"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { useTerminal } from "../store/terminal";
import { usePreferences } from "../store/preferences";
import AppIcon from "./AppIcon";

type Status = {
  ok: boolean;
  providers: Array<{ name: string; ok: number; failed: number; lastLatencyMs: number | null }>;
  ai: boolean;
};

function Clock({ tz, label }: { tz: string; label: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <span className="market-clock">
      <span className="market-clock-label">{label}</span>
      <span className="market-clock-time">{now.toLocaleTimeString("en-GB", { timeZone: tz, hour12: false })}</span>
    </span>
  );
}

function marketStateNY(): { label: string; open: boolean } {
  const ny = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = ny.getDay();
  const mins = ny.getHours() * 60 + ny.getMinutes();
  const open = day >= 1 && day <= 5 && mins >= 570 && mins < 960;
  return { label: open ? "NYSE OPEN" : "NYSE CLOSED", open };
}

export default function TopBar() {
  const setCommandOpen = useTerminal((s) => s.setCommandOpen);
  const activeSymbol = useTerminal((s) => s.activeSymbol);
  const refreshSeconds = usePreferences((s) => s.refreshSeconds);
  const { data: status } = useQuery({
    queryKey: ["status"],
    queryFn: () => apiGet<Status>("/api/status"),
    refetchInterval: refreshSeconds * 1000,
  });
  const market = marketStateNY();
  const healthy = status?.providers.filter((p) => p.ok > 0) ?? [];

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <span className="brand-mark">O</span>
        <span className="brand-name">OPEN<span>TERMINAL</span></span>
      </div>
      <span className={market.open ? "market-status up" : "market-status down"}>
        <span className="status-dot" />{market.label}
      </span>
      <div className="clock-strip">
        <Clock tz="America/New_York" label="NY" />
        <Clock tz="Europe/Rome" label="MIL" />
        <Clock tz="Europe/London" label="LDN" />
        <Clock tz="Asia/Tokyo" label="TYO" />
      </div>
      <button className="global-search" onClick={() => setCommandOpen(true)}>
        <span className="search-icon"><AppIcon name="search" size={18}/></span>
        <span className="search-copy"><strong>{activeSymbol}</strong><span>Search symbol or command…</span></span>
        <kbd>⌘ K</kbd>
      </button>
      <div className="topbar-meta">
        <span className="feed-status"><span className={healthy.length ? "status-dot up-bg" : "status-dot idle-bg"} />{healthy.length ? `${healthy.length} FEEDS LIVE` : "CONNECTING FEEDS"}</span>
        <span className={status?.ai ? "ai-status up" : "ai-status dim"}><span className="status-dot" />AI {status?.ai ? "READY" : "OFFLINE"}</span>
      </div>
    </header>
  );
}
