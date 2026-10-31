# TradingView Advanced Charts integration

## Current status

OpenTerminal currently renders its chart widget with `lightweight-charts`. This is the existing chart and remains the fallback until the licensed TradingView runtime is available.

TradingView Advanced Charts is not an npm package that can be installed from the public registry. TradingView distributes it through a private GitHub repository after an access request is approved. Do not commit the licensed runtime, its bundles, or private type declarations to this public repository.

## Required access

1. Request access to **Advanced Charts** (not the broker-only Trading Platform) through the official TradingView product page: https://www.tradingview.com/ charting-library/
2. Accept the private GitHub repository invitation from TradingView.
3. Obtain the runtime using TradingView's official installation instructions.
4. Keep the runtime out of Git. For deployment, provide it through a private build/deployment step or a private asset origin that is permitted by the TradingView license.
5. Confirm the license permits the intended public OpenTerminal deployment before publishing it.

Official quick start: https://www.tradingview.com/charting-library-docs/latest/quick-start/

## Datafeed architecture

Advanced Charts does not include market data. OpenTerminal must implement the Datafeed API and supply:

- supported resolutions and symbol metadata;
- historical OHLCV bars;
- real-time bar updates through a WebSocket or another supported streaming transport;
- symbol search and resolution.

The existing API already exposes:

- `GET /api/history/:symbol?range=...` for historical candles;
- `GET /api/search?q=...` for symbol search;
- `GET /api/quotes?symbols=...` for quote snapshots.

These endpoints currently expose a finite set of history ranges, not arbitrary `from/to/resolution` history queries. They are a useful bridge for an initial adapter, but they are not yet a complete TradingView Datafeed API. The existing history providers also have different asset coverage and update characteristics. Do not label this data as exchange-grade real-time streaming.

## Planned implementation sequence

1. Add the licensed runtime through a private deployment step.
2. Implement a typed Advanced Charts adapter and load it only on the client (Next.js uses SSR).
3. Extend the backend history API to accept symbol, resolution, `from`, and `to` and return correctly aligned bars.
4. Add a shared market-data WebSocket for live bar subscriptions and unsubscribe handling.
5. Replace the current chart widget with Advanced Charts, preserving OpenTerminal's symbol linking and workspace layout.
6. Add a controlled AI chart-command layer (symbol/timeframe changes, indicators, drawings, and chart state). Validate every AI command against an allowlist.
7. Add broker execution only through a separate broker adapter and explicit user confirmation.

## Scope limitations

Advanced Charts is not the full TradingView website. Pine Script, the native Strategy Tester, native alerts, and Bar Replay are not included. Custom indicators can be developed in JavaScript. TradingView's separate Trading Platform product has broker-oriented functionality and separate licensing.

References:
- https://www.tradingview.com/charting-library-docs/latest/connecting_data/
- https://www.tradingview.com/charting-library-docs/latest/connecting_data/datafeed-api/
- https://www.tradingview.com/charting-library-docs/latest/resources/Frequently-Asked-Questions/
