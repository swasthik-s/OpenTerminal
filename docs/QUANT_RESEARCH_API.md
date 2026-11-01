# Quant research API

All endpoints below are mounted at `/api/backtests` and require the shared API key through the web proxy.

## 1. Import historical candles

`POST /candles`

Submit 250–5,000 chronological OHLC candles per request. Timestamps are Unix seconds. Import the complete historical range in batches; duplicate symbol/timeframe/timestamp rows are replaced.

```json
{
  "symbol": "XAUUSD",
  "timeframe": "M5",
  "candles": [
    { "time": 1793400000, "open": 3980.1, "high": 3982.0, "low": 3979.5, "close": 3981.2, "volume": 120 }
  ]
}
```

## 2. Run the baseline strategy

`POST /run`

```json
{
  "symbol": "XAUUSD",
  "timeframe": "M5",
  "config": {
    "initialBalance": 100000,
    "riskPct": 0.25,
    "rewardRisk": 2,
    "fastEma": 50,
    "slowEma": 200,
    "maxTradesPerDay": 2,
    "spread": 0.3,
    "slippage": 0.1,
    "commissionPerUnit": 0
  }
}
```

Risk is a percentage of current balance, capped at 1% per trade. Cost inputs are in the instrument's price/unit convention and must be calibrated to the broker and symbol contract.

## 3. Retrieve experiments

- `GET /runs` — latest 100 backtest runs.
- `GET /runs/:id` — full configuration, metrics, trades and equity series.

## Simulator assumptions and limits

- EMA pullback v1: close above/below slow EMA, previous candle tags fast EMA, current candle closes back through fast EMA with a directional body.
- Entry is modeled at signal close with spread and slippage; no future candle is used to create the signal.
- Stop uses the six-bar local swing extreme; target is a fixed R multiple.
- If stop and target are both touched within one OHLC candle, stop is assumed first.
- One position at a time; daily trade count resets on UTC calendar dates.
- This is an OHLC-bar simulator, not tick-accurate execution. Contract-size conversion, swaps, financing, partial fills, latency, news blackout windows and broker-specific order semantics are not yet modeled.
- Historical rule profiles and the current risk calculator are monitoring-only. This API does not authorize live trading and does not send orders.
