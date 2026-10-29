"use client";

import { useEffect } from "react";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import Workspace from "./Workspace";
import CommandPalette from "./CommandPalette";
import { useTerminal } from "../store/terminal";

export default function Terminal() {
  const setCommandOpen = useTerminal((s) => s.setCommandOpen);
  const setActiveTab = useTerminal((s) => s.setActiveTab);

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
    <div className="terminal-app">
      <TopBar />
      <div className="terminal-body">
        <Sidebar />
        <main className="terminal-main"><Workspace /></main>
      </div>
      <CommandPalette />
    </div>
  );
}