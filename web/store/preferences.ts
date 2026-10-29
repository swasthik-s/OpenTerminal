"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type StartView = "ai" | "chart" | "news" | "watchlist" | "settings";
type Preferences = {
  fontScale: number;
  density: "comfortable" | "compact";
  animations: boolean;
  refreshSeconds: 15 | 30 | 60;
  startView: StartView;
  setFontScale: (value: number) => void;
  setDensity: (value: "comfortable" | "compact") => void;
  setAnimations: (value: boolean) => void;
  setRefreshSeconds: (value: 15 | 30 | 60) => void;
  setStartView: (value: StartView) => void;
  resetPreferences: () => void;
};

const defaults = {
  fontScale: 1.08,
  density: "comfortable" as const,
  animations: true,
  refreshSeconds: 30 as const,
  startView: "ai" as const,
};

export const usePreferences = create<Preferences>()(persist((set) => ({
  ...defaults,
  setFontScale: (fontScale) => set({ fontScale: Math.min(1.3, Math.max(0.9, fontScale)) }),
  setDensity: (density) => set({ density }),
  setAnimations: (animations) => set({ animations }),
  setRefreshSeconds: (refreshSeconds) => set({ refreshSeconds }),
  setStartView: (startView) => set({ startView }),
  resetPreferences: () => set(defaults),
}), { name: "openterminal-preferences", version: 1 }));
