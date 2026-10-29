"use client";

import { useEffect } from "react";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import Workspace from "./Workspace";
import CommandPalette from "./CommandPalette";
import { useTerminal } from "../store/terminal";

export default function Terminal() {
  const setCommandOpen = useTerminal((s) => s.setCommandOpen);
  const openTab = useTerminal((s) => s.openTab);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }
      if (e.altKey) {
        const map: Record<string, () => void> = {
          "1": () => openTab("chart"),
          "2": () => openTab("quote"),
          "3": () => openTab("news"),
          "4": () => openTab("screener"),
          "5": () => openTab("heatmap"),
          "6": () => openTab("crypto"),
          "7": () => openTab("options"),
          "8": () => openTab("portfolio"),
          "9": () => openTab("ai"),
        };
        const fn = map[e.key];
        if (fn) {
          e.preventDefault();
          fn();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen, openTab]);

  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Workspace />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
