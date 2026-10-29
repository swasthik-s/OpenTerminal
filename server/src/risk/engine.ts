import type { PropRule } from "../rules/schema.js";

export type RiskInput = {
  startingBalance: number;
  balance: number;
  equity: number;
  /** Realized P/L since the account's firm-defined daily reset, net of costs. */
  dailyClosedPnl: number;
  /** Open-position P/L including commission and swap when provided by the broker. */
  floatingPnl: number;
  /** Current day's costs not already reflected in dailyClosedPnl/floatingPnl. */
  additionalCosts?: number;
  /** Current phase's closed profit, calculated using the official accounting rule. */
  phaseClosedProfit: number;
  phaseIndex?: number;
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

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

function assertFiniteNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number`);
  }
}

/**
 * Monitoring-only calculation. It cannot enable trading or execute orders.
 *
 * Important: this is a preliminary absolute-P/L calculator, not a final replica
 * of any firm's rule. Daily limits tied to a midnight balance/equity baseline,
 * end-of-day trailing drawdown, consistency rules, profitable-day rules, and
 * other firm-specific semantics require additional inputs and implementations.
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
    dailyClosedPnl: input.dailyClosedPnl,
    floatingPnl: input.floatingPnl,
    additionalCosts: input.additionalCosts ?? 0,
    softStopAtPct: buffers.softStopAtPct,
    hardStopAtPct: buffers.hardStopAtPct,
    overallGuardAtPct: buffers.overallGuardAtPct,
  })) assertFinite(name, value);

  assertFiniteNonNegative("startingBalance", input.startingBalance);
  assertFiniteNonNegative("balance", input.balance);
  assertFiniteNonNegative("equity", input.equity);
  assertFiniteNonNegative("tradingDays", input.tradingDays);
  assertFiniteNonNegative("phaseIndex", input.phaseIndex ?? 0);
  if (input.phaseClosedProfit < -input.startingBalance) {
    throw new RangeError("phaseClosedProfit is outside supported bounds");
  }
  const phaseIndex = input.phaseIndex ?? 0;
  const phase = rule.phases[phaseIndex];
  if (!phase) throw new RangeError("phaseIndex does not exist in the rule file");

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

  const phaseProfitTarget = rule.accountSize * phase.profitTargetPct / 100;
  const phaseProfitProgressPct = phaseProfitTarget > 0
    ? Math.max(0, input.phaseClosedProfit) / phaseProfitTarget * 100
    : 100;

  const reasons: string[] = [
    "Monitoring only: live trading is disabled until official program semantics and the EA Guardian are implemented and verified.",
  ];
  const dailySoftStop = dailyLossUsedPct >= buffers.softStopAtPct;
  const dailyHardStop = dailyLossUsedPct >= buffers.hardStopAtPct;
  const overallDrawdownGuard = totalLossUsedPct >= buffers.overallGuardAtPct;
  if (dailySoftStop) reasons.push("Daily soft-stop threshold reached.");
  if (dailyHardStop) reasons.push("Daily hard-stop threshold reached.");
  if (overallDrawdownGuard) reasons.push("Overall drawdown guard threshold reached.");
  if (dailyLossUsed >= dailyLossLimit) reasons.push("Configured daily-loss amount reached or exceeded.");
  if (totalLossUsed >= totalLossLimit) reasons.push("Configured overall-loss amount reached or exceeded.");

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
