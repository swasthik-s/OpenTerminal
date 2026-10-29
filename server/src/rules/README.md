# Prop-firm rule files

These files are **configuration templates**, not a guarantee of compliance. The FTMO
1-Step values below were checked against FTMO's public Trading Objectives page on
2026-10-29; re-check the official page and the terms for the exact account before use.

## FTMO 1-Step model currently represented

- Challenge profit target: 10%.
- Maximum Daily Loss: 3% of initial simulated capital, recalculated at midnight
  CE(S)T from the balance at the reset.
- Maximum Loss: 10% of initial simulated capital, with an end-of-day trailing
  threshold based on the highest prior end-of-day balance (or initial capital,
  if higher).
- Best Day Rule: 50% of total profit for the 1-Step evaluation.

Official source: https://ftmo.com/en/trading-objectives/

## Important implementation limits

1. The risk engine now accepts `dailyResetBalance` and `highestEndOfDayBalance`
   for trailing rules. They must be captured from a trusted MT5/EA feed; do not
   derive them from the current balance.
2. The 50% Best Day Rule is represented in configuration but is **not yet enforced**
   by the risk engine. It needs daily closed-P/L history and a dedicated evaluator.
3. The timezone identifier `Europe/Prague` represents the CE(S)T daylight-saving
   zone, but exact reset-boundary behavior must be tested against MT5 server time
   and the current account terms.
4. `validForLiveUse` is intentionally always false. Schema validation checks shape,
   not factual correctness or full program compliance.
5. Telegram delivery, MT5 ingestion, a local Guardian, and live order blocking are
   not implemented by this PR.

Never allow a strategy or AI proposal to increase risk limits or override the EA-side
Guardian. These server calculations are monitoring foundations, not an execution
safety guarantee.
