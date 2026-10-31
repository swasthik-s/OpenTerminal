# TradingView charting strategy

## Current decision

OpenTerminal will use **TradingView Lightweight Charts** as its active chart engine for now. It is already integrated in `web/components/widgets/ChartWidget.tsx`, uses the v5 API, and is available through the public npm package.

Official project: https://github.com/tradingview/lightweight-charts  
Documentation: https://tradingview.github.io/lightweight-charts/docs

Lightweight Charts is open source under Apache 2.0. The application must retain the TradingView attribution notice from the package's `NOTICE` file and include a link to https://www.tradingview.com/. The chart enables the built-in attribution logo.

## Current OpenTerminal implementation

The existing chart provides:

- Candlestick, OHLC bar, line, and area chart types.
- Range controls from 1D through MAX.
- Volume histogram.
- SMA, EMA, VWAP, Bollinger Bands, RSI, and MACD overlays/panes.
- Crosshair OHLCV and indicator legend.
- Symbol linking through the terminal workspace.
- Historical data from the existing `GET /api/history/:symbol?range=...` endpoint.

The backend currently supplies range-based candles via its configured providers. Do not describe these candles as exchange-grade real-time data. The current periodic query refresh is a snapshot/polling mechanism, not a WebSocket market-data stream.

## Planned improvements on Lightweight Charts

1. Improve the chart toolbar and drawing/annotation workflow.
2. Add chart markers for AI analysis and trade plans using the v5 `createSeriesMarkers` API.
3. Add price lines for entry, stop-loss, take-profit, and key levels.
4. Add a validated AI chart-command interface for symbol/range changes, indicators, markers, price lines, and chart state.
5. Extend backend market data with normalized symbol/resolution/history contracts.
6. Add a shared streaming transport when a provider with suitable real-time data is connected.
7. Add drawing tools through supported Lightweight Charts plugins/primitives rather than manipulating internal canvas or DOM implementation details.

For v5, create series with `chart.addSeries(SeriesType, options)`. Series markers use `createSeriesMarkers(series, markers)`; do not use the v4 `addCandlestickSeries` or `series.setMarkers` APIs.

## Advanced Charts later

Advanced Charts remains a possible future upgrade, not a current dependency. It is distributed by TradingView through a private repository after approval and is subject to separate licensing terms. Do not commit its licensed runtime or private type declarations to this public repository. Before switching, verify that the intended use and public deployment are permitted by the license, obtain access, implement the complete Datafeed API, and preserve the same OpenTerminal symbol/workspace and AI command interfaces.

Official quick start: https://www.tradingview.com/charting-library-docs/latest/quick-start/

## Important scope distinction

Lightweight Charts is a rendering library, not a market-data provider. OpenTerminal remains responsible for data acquisition, normalization, historical coverage, streaming, indicators, and execution integrations. It does not provide the full TradingView website experience or built-in Pine Script / Strategy Tester functionality.

References:
- https://github.com/tradingview/lightweight-charts
- https://tradingview.github.io/lightweight-charts/docs
- https://tradingview.github.io/lightweight-charts/docs/migrations/from-v4-to-v5
- https://www.tradingview.com/charting-library-docs/latest/quick-start/
