# OpenTerminal integrations

## Current status

- **Market data:** the existing API server aggregates public provider data. Settings shows providers that have recently succeeded or failed in this running API process.
- **Polymarket:** the app uses the public Gamma market-data API through `GET /api/polymarket/markets`; no wallet or trading credentials are needed to read public markets. This does not place orders or stream the CLOB order book.
- **RSS / Atom:** add HTTPS feeds from Settings → RSS / Atom feeds. The API validates the URL, rejects local/private hosts, checks the XML response, and stores feed URLs in SQLite. Feeds are merged with the existing Yahoo Finance and Google News sources. The optional `RSS_FEEDS` server variable accepts comma-separated URLs.
- **AI:** the existing chat endpoint uses the server-side Anthropic API key. Settings → Integration health → Test API sends a minimal live request to confirm the key/model works.
- **Alpaca:** Settings can test a server-configured account against Alpaca's account endpoint. Paper mode is the default. This is an account handshake only; it does not enable live order placement or broker streaming.
- **Other brokers:** IBKR, OANDA, Tradovate, and MT5 are listed as integration targets but are **not yet connected**. They require their own OAuth/session or gateway adapters and a secure credential lifecycle before they should be shown as connected.

## Configure the server

1. Copy `server/.env.example` as a reference; set values in your API host's environment/secrets panel, not in frontend code.
2. Generate a long random `API_KEY` and set the same value on the API service and the Vercel frontend environment, where the proxy reads it server-side.
3. Set `WEB_ORIGIN` to the exact deployed frontend origin.
4. Set `ANTHROPIC_API_KEY` on the API service to enable AI chat and the AI connection test.
5. For Alpaca, create a **paper-trading** API key first, then set `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, and `ALPACA_PAPER=true`.
6. Keep API keys out of `NEXT_PUBLIC_*` variables, Git commits, browser local storage, and chat messages.

## Verification

- `GET /api/status` reports market-provider activity and whether the AI key is configured.
- Settings → Integration health shows configured integrations and runtime provider health.
- Use **Test API** for Anthropic and **Test account** for Alpaca to verify actual server-to-provider connectivity.
- Add an RSS feed through Settings. A successful add means the URL resolved to a public host, responded over HTTPS, and returned parseable RSS/Atom XML.
- Polymarket's page reports live public-feed status only when the API proxy request succeeds.

## Important limitations

Do not treat a configured key as proof that an account is connected. Do not enable live order routing until OAuth/token handling, permissions, account state, order confirmation, audit logging, risk limits, and disconnect/revocation flows have been implemented and tested. The current backtest screen remains configuration-only.
