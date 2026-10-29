import { Router } from "express";

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
  const rss = Boolean(process.env.RSS_FEEDS);
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

integrationsRouter.get("/status", (_req, res) => {
  res.json({ checkedAt: new Date().toISOString(), integrations: configuredStatus() });
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
