"use client";

import { useEffect, type CSSProperties } from "react";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import Workspace from "./Workspace";
import CommandPalette from "./CommandPalette";
import { useTerminal } from "../store/terminal";
import { usePreferences } from "../store/preferences";

export default function Terminal() {
  const setCommandOpen = useTerminal((s) => s.setCommandOpen);
  const setActiveTab = useTerminal((s) => s.setActiveTab);
  const fontScale = usePreferences((s) => s.fontScale);
  const density = usePreferences((s) => s.density);
  const animations = usePreferences((s) => s.animations);
  const startView = usePreferences((s) => s.startView);

  useEffect(() => { setActiveTab(startView); }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }
      if (event.altKey) {
        const map: Record<string, () => void> = {
          "1": () => setActiveTab("chart"), "2": () => setActiveTab("quote"),
          "3": () => setActiveTab("news"), "4": () => setActiveTab("screener"),
          "5": () => setActiveTab("heatmap"), "6": () => setActiveTab("crypto"),
          "7": () => setActiveTab("options"), "8": () => setActiveTab("portfolio"),
          "9": () => setActiveTab("ai"),
        };
        const action = map[event.key];
        if (action) { event.preventDefault(); action(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen, setActiveTab]);

  return (
    <div className="terminal-app" data-density={density} data-motion={animations ? "on" : "off"} style={{ "--font-scale": fontScale } as CSSProperties}>
      <TopBar />
      <div className="terminal-body">
        <Sidebar />
        <main className="terminal-main"><Workspace /></main>
      </div>
      <CommandPalette />
    </div>
  );
}