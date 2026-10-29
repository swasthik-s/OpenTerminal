import type { SVGProps } from "react";

export type IconName = "sparkles" | "chart" | "star" | "newspaper" | "search" | "sliders" | "activity" | "wallet" | "settings" | "globe" | "arrow-up-right" | "refresh" | "check" | "plug" | "rss" | "shield" | "chevron-right" | "brain" | "calendar" | "x" | "external-link" | "panel-left" | "server" | "circle-help";

const paths: Record<IconName, React.ReactNode> = {
  sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.1L19 22l-1.1-2.9L15 18l2.9-1.2L19 14Z"/></>,
  chart: <><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 6-7"/></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>,
  newspaper: <><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 8h5v4H7zM15 8h2M15 11h2M7 16h10"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
  sliders: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></>,
  activity: <path d="M3 12h4l3-8 4 16 3-8h4"/>,
  wallet: <><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h13M16 14h5"/><circle cx="16" cy="14" r=".7"/></>,
  settings: <><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19.4 15 .1.1 1.2.9-1.5 2.6-1.5-.6a8 8 0 0 1-1.6.9l-.3 1.6h-3l-.3-1.6a8 8 0 0 1-1.6-.9l-1.5.6-1.5-2.6 1.2-.9a7 7 0 0 1 0-1.9l-1.2-.9 1.5-2.6 1.5.6a8 8 0 0 1 1.6-.9l.3-1.6h3l.3 1.6a8 8 0 0 1 1.6.9l1.5-.6 1.5 2.6-1.2.9a7 7 0 0 1 0 1.8Z"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,
  "arrow-up-right": <><path d="M7 17 17 7M7 7h10v10"/></>,
  refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  plug: <><path d="M12 22v-5M9 8V2M15 8V2M5 8h14v4a7 7 0 0 1-14 0V8Z"/></>,
  rss: <><path d="M5 19a2 2 0 1 0 0 .1"/><path d="M4 11a9 9 0 0 1 9 9M4 5a15 15 0 0 1 15 15"/></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
  "chevron-right": <path d="m9 18 6-6-6-6"/>,
  brain: <><path d="M12 18V5a3 3 0 0 0-5.8-1A4 4 0 0 0 4 11a4 4 0 0 0 2 7 3 3 0 0 0 6 0ZM12 18V5a3 3 0 0 1 5.8-1A4 4 0 0 1 20 11a4 4 0 0 1-2 7 3 3 0 0 1-6 0Z"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  x: <path d="m18 6-12 12M6 6l12 12"/>,
  "external-link": <><path d="M14 3h7v7M10 14 21 3"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></>,
  "panel-left": <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
  server: <><rect x="3" y="3" width="18" height="7" rx="1"/><rect x="3" y="14" width="18" height="7" rx="1"/><path d="M7 6h.01M7 17h.01M11 6h6M11 17h6"/></>,
  "circle-help": <><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.1 1.9c-1.2.9-1.7 1.2-1.7 2.6M12 17h.01"/></>,
};

export default function AppIcon({ name, size = 18, strokeWidth = 1.7, className, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number; strokeWidth?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>{paths[name]}</svg>;
}
