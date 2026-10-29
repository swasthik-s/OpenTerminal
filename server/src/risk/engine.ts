import type { PropRule } from "../rules/schema.js";

export type RiskInput = {
  startingBalance: number;
  balance: number;
  equity: number;
  /** Realized P/L since the account's firm-defined daily reset, net of costs. */
  dailyClosedPnl: number;
  /** Open-position P/L including commission and swap when provided by the broker. */
  floatingPnl: number;
  /** Current day's commission and swap not already reflected in dailyClosedPnl/floatingPnl. */
  additionalCosts?: number;
  /** Current profit in the phase, based on the firm's official accounting rule. */
  phaseClosedProfit: number;
  tradingDays: number;
  profitableDays?: number;
};

export type RiskStatus = {
  eligibleForLiveUse: false;
  accountSize: number;
  dailyLossUsed: number;
  dailyLossLimit: number;
  dailyLossUsedPct: number;
  dailyHeadroom: number;
  totalLossUsed: number;
  totalLossLimit: number;
  totalLossUsedPct: number;
  totalHeadroom: number;
  phaseProfitTarget: number;
  phaseProfitProgressPct: number;
  tradingDays: number;
  minimumTradingDays: number;
  dailySoftStop: boolean;
  dailyHardStop: boolean;
  overallDrawdownGuard: boolean;
  reasons: string[];
};

function assertFiniteNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number`);
  }
}

/**
 * Pure monitoring calculation; conservative thresholds are supplied separately.
 * This intentionally cannot enable trading or execute orders.
 *
 * Daily loss is negative P/L since reset, including floating P/L and additional
 * costs. Total loss uses starting balance as the reference for static drawdown;
 * trailing drawdown requires a high-water mark and is rejected until supplied.
 */
export function calculateRiskStatus(
  rule: PropRule,
  input: RiskInput,
  buffers: { softStopAtPct: number; hardStopAtPct: number; overallGuardAtPct: number },
): RiskStatus {
  for (const [name, value] of Object.entries({
    startingBalance: input.startingBalance,
    balance: input.balance,
    equity: input.equity,
    phaseClosedProfit: input.phaseClosedProfit,
    tradingDays: input.tradingDays,
    dailyClosedPnl: Math.abs(input.dailyClosedPnl),
    floatingPnl: Math.abs(input.floatingPnl),
    additionalCosts: Math.abs(input.additionalCosts ?? 0),
    softStopAtPct: buffers.softStopAtPct,
    hardStopAtPct: buffers.hardStopAtPct,
    overallGuardAtPct: buffers.overallGuardAtPct,
  })) {
    if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  }
  assertFiniteNonNegative("startingBalance", input.startingBalance);
  assertFiniteNonNegative("balance", input.balance);
  assertFiniteNonNegative("equity", input.equity);
  assertFiniteNonNegative("tradingDays", input.tradingDays);
  if (input.phaseClosedProfit < -input.startingBalance) {
    throw new RangeError("phaseClosedProfit is outside supported bounds");
  }
  if (rule.drawdownType === "trailing") {
    throw new Error("Trailing drawdown requires a verified high-water-mark implementation");
  }
  for (const [name, value] of Object.entries(buffers)) {
    if (!(value > 0 && value < 100)) {
      throw new RangeError(`${name} must be greater than 0 and less than 100`);
    }
  }
  if (!(buffers.softStopAtPct < buffers.hardStopAtPct)) {
    throw new RangeError("soft-stop threshold must be below hard-stop threshold");
  }

  const dailyLossLimit = rule.accountSize * rule.maxDailyLossPct / 100;
  const dailyNetPnl = input.dailyClosedPnl + input.floatingPnl - (input.additionalCosts ?? 0);
  const dailyLossUsed = Math.max(0, -dailyNetPnl);
  const dailyLossUsedPct = dailyLossLimit > 0 ? dailyLossUsed / dailyLossLimit * 100 : 100;
  const dailyHeadroom = Math.max(0, dailyLossLimit - dailyLossUsed);

  const totalLossLimit = rule.accountSize * rule.maxTotalLossPct / 100;
  const totalLossUsed = Math.max(0, input.startingBalance - input.equity);
  const totalLossUsedPct = totalLossLimit > 0 ? totalLossUsed / totalLossLimit * 100 : 100;
  const totalHeadroom = Math.max(0, totalLossLimit - totalLossUsed);

  const phase = rule.phases[0];
  const phaseProfitTarget = rule.accountSize * phase.profitTargetPct / 100;
  const phaseProfitProgressPct = phaseProfitTarget > 0
    ? Math.max(0, input.phaseClosedProfit) / phaseProfitTarget * 100
    : 100;

  const reasons: string[] = [
    "Monitoring only: live trading is disabled until official program terms and the EA Guardian are verified.",
  ];
  const dailySoftStop = dailyLossUsedPct >= buffers.softStopAtPct;
  const dailyHardStop = dailyLossUsedPct >= buffers.hardStopAtPct;
  const overallDrawdownGuard = totalLossUsedPct >= buffers.overallGuardAtPct;
  if (dailySoftStop) reasons.push("Daily soft-stop threshold reached.");
  if (dailyHardStop) reasons.push("Daily hard-stop threshold reached.");
  if (overallDrawdownGuard) reasons.push("Overall drawdown guard threshold reached.");
  if (dailyLossUsed >= dailyLossLimit) reasons.push("Published daily-loss limit reached or exceeded.");
  if (totalLossUsed >= totalLossLimit) reasons.push("Published overall-loss limit reached or exceeded.");

  return {
    eligibleForLiveUse: false,
    accountSize: rule.accountSize,
    dailyLossUsed,
    dailyLossLimit,
    dailyLossUsedPct,
    dailyHeadroom,
    totalLossUsed,
    totalLossLimit,
    totalLossUsedPct,
    totalHeadroom,
    phaseProfitTarget,
    phaseProfitProgressPct,
    tradingDays: input.tradingDays,
    minimumTradingDays: phase.minTradingDays,
    dailySoftStop,
    dailyHardStop,
    overallDrawdownGuard,
    reasons,
  };
}
