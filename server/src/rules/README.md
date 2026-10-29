# Prop-firm rule files

Files in this directory are **provisional templates**, not verified specifications for live trading.

Before use:
1. Open the official program rules at the source URL in the JSON file.
2. Verify the exact account type, phase, daily-loss calculation, reset timezone,
   total drawdown model, profitable-day requirements, news rules, EA restrictions,
   and any payout/consistency rules that affect the intended account.
3. Update `dailyResetTimezone` and `lastVerified` only after verification.
4. Update `drawdownType` and the risk engine together if the official rule uses a
   trailing or balance-high-water-mark model.
5. Add tests using examples from official rules before enabling live enforcement.

The API's `validForLiveUse` means only that a file passes the current schema; it
does not certify that the values are factually correct. The API response therefore
uses the more careful status `verified-schema`, not "officially verified".

The current risk engine intentionally supports static overall-loss calculations
only. It rejects `drawdownType: "trailing"` until correct high-water-mark support
and shared test vectors are implemented.

Official sources to check:
- FTMO Trading Objectives: https://ftmo.com/en/trading-objectives/
- The5ers High Stakes FAQ: https://the5ers.com/faqs/what-are-the-general-rules-for-the-high-stakes-program/

Never allow a strategy or AI proposal to increase risk limits or override the EA-side
Guardian. These server calculations are monitoring foundations, not an execution
safety guarantee.
