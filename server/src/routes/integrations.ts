import { Router } from "express";
import { Anthropic } from "@anthropic-ai/sdk";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { XMLParser } from "fast-xml-parser";
import { db } from "../db.js";

export const integrationsRouter = Router();

type IntegrationState = {
  id: string;
  label: string;
  configured: boolean;
  mode: "ready-to-test" | "not-configured" | "manual-setup";
  detail: string;
};

function configuredStatus(): IntegrationState[] {
  const alpaca = Boolean(process.env.ALPACA_API_KEY && process.env.ALPACA_SECRET_KEY);
  const ibkr = Boolean(process.env.IBKR_GATEWAY_URL && process.env.IBKR_ACCOUNT_ID);
  const oanda = Boolean(process.env.OANDA_API_TOKEN && process.env.OANDA_ACCOUNT_ID);
  const tradovate = Boolean(process.env.TRADOVATE_ACCESS_TOKEN);
  const mt5 = Boolean(process.env.MT5_BRIDGE_URL && process.env.MT5_BRIDGE_TOKEN);
  const savedRss = Number((db.prepare("SELECT COUNT(*) AS count FROM rss_feeds WHERE enabled = 1").get() as {count:number}).count);
  const rss = Boolean(process.env.RSS_FEEDS) || savedRss > 0;
  const ai = Boolean(process.env.ANTHROPIC_API_KEY);
  return [
    { id: "ai", label: "Anthropic AI", configured: ai, mode: ai ? "ready-to-test" : "not-configured", detail: ai ? "Server API key is present; request health is checked when used." : "Set ANTHROPIC_API_KEY on the API server." },
    { id: "alpaca", label: "Alpaca", configured: alpaca, mode: alpaca ? "ready-to-test" : "not-configured", detail: alpaca ? "Server credentials are present; run a live account handshake." : "Set ALPACA_API_KEY and ALPACA_SECRET_KEY on the API server." },
    { id: "ibkr", label: "Interactive Brokers", configured: ibkr, mode: ibkr ? "ready-to-test" : "not-configured", detail: ibkr ? "Gateway details are present; session authentication still needs testing." : "Requires a reachable Client Portal Gateway and account ID." },
    { id: "oanda", label: "OANDA", configured: oanda, mode: oanda ? "ready-to-test" : "not-configured", detail: oanda ? "Token and account ID are present; API handshake still needs testing." : "Set OANDA_API_TOKEN and OANDA_ACCOUNT_ID on the API server." },
    { id: "tradovate", label: "Tradovate", configured: tradovate, mode: tradovate ? "ready-to-test" : "not-configured", detail: tradovate ? "Access token is present; session and permissions need testing." : "OAuth setup and server-side token storage are required." },
    { id: "mt5", label: "MetaTrader 5", configured: mt5, mode: mt5 ? "ready-to-test" : "not-configured", detail: mt5 ? "Bridge endpoint and token are present; health check still required." : "Requires a secured MT5 bridge or Expert Advisor connector." },
    { id: "rss", label: "Custom RSS feeds", configured: rss, mode: rss ? "ready-to-test" : "not-configured", detail: rss ? "RSS_FEEDS is set on the API server." : "Add comma-separated trusted RSS/Atom URLs to RSS_FEEDS on the API server." },
    { id: "polymarket", label: "Polymarket public data", configured: true, mode: "ready-to-test", detail: "Public Gamma API data; no wallet permissions are needed to read markets." },
  ];
}


function isPublicIp(ip: string): boolean {
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    return lower !== "::1" && lower !== "::" && !lower.startsWith("fc") && !lower.startsWith("fd") && !lower.startsWith("fe80:") && !lower.startsWith("::ffff:127.") && !lower.startsWith("::ffff:10.") && !lower.startsWith("::ffff:192.168.");
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a,b] = parts;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19));
}

async function validateFeedUrl(value: unknown): Promise<URL> {
  if (typeof value !== "string" || value.length > 2048) throw new Error("Enter a valid HTTPS RSS or Atom URL.");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Enter a valid HTTPS RSS or Atom URL."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443") throw new Error("Only public HTTPS feed URLs on the default port are allowed.");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) throw new Error("Local or internal hosts are not allowed.");
  const ipType = isIP(url.hostname);
  const addresses = ipType ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => !isPublicIp(entry.address))) throw new Error("Feed host resolves to a private or reserved address.");
  return url;
}

integrationsRouter.get("/rss-feeds", (_req, res) => {
  const feeds = db.prepare("SELECT id, url, label, enabled, created_at AS createdAt FROM rss_feeds ORDER BY id DESC").all();
  res.json(feeds);
});

integrationsRouter.post("/rss-feeds", async (req, res) => {
  try {
    const url = await validateFeedUrl(req.body?.url);
    const response = await fetch(url, { headers: { "User-Agent": "OpenTerminal/1.0" }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return res.status(400).json({ error: `Feed returned HTTP ${response.status}.` });
    const xml = await response.text();
    if (xml.length > 2_000_000) return res.status(400).json({ error: "Feed response is too large (2 MB maximum)." });
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
    if (!parsed?.rss?.channel && !parsed?.feed && !parsed?.channel) return res.status(400).json({ error: "URL responded, but the content does not look like RSS or Atom XML." });
    const label = typeof req.body?.label === "string" && req.body.label.trim() ? req.body.label.trim().slice(0, 80) : url.hostname;
    const result = db.prepare("INSERT INTO rss_feeds (url, label) VALUES (?, ?) ON CONFLICT(url) DO UPDATE SET label = excluded.label, enabled = 1").run(url.toString(), label);
    const feed = db.prepare("SELECT id, url, label, enabled, created_at AS createdAt FROM rss_feeds WHERE url = ?").get(url.toString());
    res.status(201).json({ feed, message: "Feed validated and saved." });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not validate feed." });
  }
});

integrationsRouter.delete("/rss-feeds/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid feed ID." });
  const result = db.prepare("DELETE FROM rss_feeds WHERE id = ?").run(id);
  if (!result.changes) return res.status(404).json({ error: "Feed not found." });
  res.status(204).end();
});

integrationsRouter.get("/status", (_req, res) => {
  res.json({ checkedAt: new Date().toISOString(), integrations: configuredStatus() });
});

integrationsRouter.post("/ai/test", async (_req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(400).json({ ok: false, error: "Set ANTHROPIC_API_KEY on the API server first." });
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
      max_tokens: 12,
      messages: [{ role: "user", content: "Reply with the single word OK." }],
    });
    const answer = response.content.flatMap((block) => block.type === "text" ? [block.text] : []).join("").trim();
    res.json({ ok: true, model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8", response: answer, checkedAt: new Date().toISOString() });
  } catch (error) {
    res.status(502).json({ ok: false, error: error instanceof Error ? error.message : "AI provider handshake failed." });
  }
});

integrationsRouter.post("/alpaca/test", async (_req, res) => {
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_SECRET_KEY;
  if (!key || !secret) return res.status(400).json({ ok: false, error: "Set ALPACA_API_KEY and ALPACA_SECRET_KEY on the API server first." });
  const paper = process.env.ALPACA_PAPER !== "false";
  const base = paper ? "https://paper-api.alpaca.markets" : "https://api.alpaca.markets";
  try {
    const response = await fetch(base + "/v2/account", { headers: { "APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      const reason = response.status === 401 ? "Alpaca rejected the credentials." : `Alpaca returned HTTP ${response.status}.`;
      return res.status(502).json({ ok: false, error: reason, paper });
    }
    const account = await response.json() as { id?: string; status?: string; currency?: string; trading_blocked?: boolean };
    res.json({ ok: true, paper, account: { id: account.id, status: account.status, currency: account.currency, tradingBlocked: account.trading_blocked }, checkedAt: new Date().toISOString() });
  } catch {
    res.status(502).json({ ok: false, error: "Could not reach Alpaca account endpoint from the API server.", paper });
  }
});
