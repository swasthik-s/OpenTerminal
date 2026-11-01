# FTMO + cTrader demo integration status

## Safety mode
- All account automation is PAPER ONLY.
- Live trading is disabled in code and there is no live order route.
- cTrader OAuth request is read-only `accounts` scope.
- The OAuth callback currently validates state but intentionally does not exchange or persist tokens.
- cTrader streaming market/account adapter and demo order submission are not yet implemented. Do not interpret the OAuth URL as a connected account.

## FTMO rule profiles
Official source: https://ftmo.com/en/trading-objectives/

- FTMO 2-Step: maximum daily loss 5% of initial capital, recalculated from the balance at 00:00 CE(S)T; maximum loss 10% static from initial capital.
- FTMO 1-Step: maximum daily loss 3% of initial capital, recalculated from midnight balance; maximum loss 10% based on highest closed balance, recalculated in real time.
- This implementation applies an internal lock at 80% of either allowance, before the firm's hard floor.
- Program must be selected explicitly. The user has not yet confirmed 1-Step vs 2-Step.
- Verify current FTMO terms, account-specific order date, instruments and platform restrictions before use.

## API
- GET /api/prop/status
- POST /api/prop/paper/configure { "program":"2-step", "capital":100000 }
- POST /api/prop/risk/evaluate { "program":"2-step", "initialCapital":100000, "balance":100000, "equity":100000, "dayStartBalance":100000, "highestClosedBalance":100000 }
- POST /api/prop/paper/mark { "equity":99500 }
- POST /api/prop/paper/orders { "symbol":"XAUUSD", "side":"BUY", "quantity":1, "entry":2000, "stop":1990, "target":2020 }
- GET /api/prop/paper/orders
- POST /api/prop/paper/orders/:id/close { "exit":2010 }
- GET /api/ctrader/status
- GET /api/ctrader/authorize

## Known limitations
- The demo paper ledger is a local simulation, not an FTMO cTrader demo account.
- Paper orders are manually marked/closed; there is no live price stream yet.
- Day-start balance must be sourced from cTrader account history at the correct CE(S)T rollover. The current paper API does not yet automate daily rollover.
- This governor is not yet wired into a broker order path. Live trading remains disabled.
- Account equity marks and closed balance highs must come from trusted broker snapshots before any paper/live eligibility.
