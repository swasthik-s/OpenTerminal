import type { PropRule } from "../rules/schema.js";

export type RiskInput = {
  startingBalance: number;
  balance: number;
  equity: number;
  dailyClosedPnl: number;
  floatingPnl: number;
  additionalCosts?: number;
  dailyResetBalance?: number;
  highestEndOfDayBalance?: number;
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
  dailyLossLimitEquityFloor: number;
  dailyLossUsedPct: number;
  dailyHeadroom: number;
  totalLossUsed: number;
  totalLossLimit: number;
  totalLossEquityFloor: number;
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
 * Monitoring-only calculation. It never enables trading or executes orders.
 * Trailing rules require trusted daily-reset and highest completed EOD balances.
 * This is not a substitute for firm-side accounting or an EA-side Guardian.
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
    dailyResetBalance: input.dailyResetBalance ?? 0,
    highestEndOfDayBalance: input.highestEndOfDayBalance ?? 0,
    softStopAtPct: buffers.softStopAtPct,
    hardStopAtPct: buffers.hardStopAtPct,
    overallGuardAtPct: buffers.overallGuardAtPct,
  })) assertFinite(name, value);

  assertFiniteNonNegative("startingBalance", input.startingBalance);
  assertFiniteNonNegative("balance", input.balance);
  assertFiniteNonNegative("equity", input.equity);
  assertFiniteNonNegative("tradingDays", input.tradingDays);
  assertFiniteNonNegative("phaseIndex", input.phaseIndex ?? 0);
  if (input.phaseClosedProfit < -input.startingBalance) throw new RangeError("phaseClosedProfit is outside supported bounds");
  const phaseIndex = input.phaseIndex ?? 0;
  const phase = rule.phases[phaseIndex];
  if (!phase) throw new RangeError("phaseIndex does not exist in the rule file");

  if (rule.drawdownType === "trailing") {
    if (input.dailyResetBalance === undefined || input.highestEndOfDayBalance === undefined) {
      throw new Error("Trailing rule requires dailyResetBalance and highestEndOfDayBalance from the EA feed");
    }
    assertFiniteNonNegative("dailyResetBalance", input.dailyResetBalance);
    assertFiniteNonNegative("highestEndOfDayBalance", input.highestEndOfDayBalance);
    if (input.highestEndOfDayBalance < input.startingBalance) {
      throw new RangeError("highestEndOfDayBalance cannot be below startingBalance");
    }
  }

  for (const [name, value] of Object.entries(buffers)) {
    if (!(value > 0 && value < 100)) throw new RangeError(`${name} must be greater than 0 and less than 100`);
  }
  if (!(buffers.softStopAtPct < buffers.hardStopAtPct)) {
    throw new RangeError("soft-stop threshold must be below hard-stop threshold");
  }

  const dailyLossLimit = rule.accountSize * rule.maxDailyLossPct / 100;
  const dailyReference = rule.drawdownType === "trailing" ? input.dailyResetBalance! : input.startingBalance;
  const dailyLossLimitEquityFloor = dailyReference - dailyLossLimit;
  const dailyNetPnl = input.dailyClosedPnl + input.floatingPnl - (input.additionalCosts ?? 0);
  const dailyLossUsed = rule.drawdownType === "trailing"
    ? Math.max(0, dailyReference - input.equity)
    : Math.max(0, -dailyNetPnl);
  const dailyLossUsedPct = dailyLossLimit > 0 ? dailyLossUsed / dailyLossLimit * 100 : 100;
  const dailyHeadroom = Math.max(0, dailyLossLimit - dailyLossUsed);

  const totalLossLimit = rule.accountSize * rule.maxTotalLossPct / 100;
  const totalLossReference = rule.drawdownType === "trailing"
    ? Math.max(input.startingBalance, input.highestEndOfDayBalance!)
    : input.startingBalance;
  const totalLossEquityFloor = totalLossReference - totalLossLimit;
  const totalLossUsed = Math.max(0, totalLossReference - input.equity);
  const totalLossUsedPct = totalLossLimit > 0 ? totalLossUsed / totalLossLimit * 100 : 100;
  const totalHeadroom = Math.max(0, totalLossLimit - totalLossUsed);

  const phaseProfitTarget = rule.accountSize * phase.profitTargetPct / 100;
  const phaseProfitProgressPct = phaseProfitTarget > 0
    ? Math.max(0, input.phaseClosedProfit) / phaseProfitTarget * 100
    : 100;

  const reasons = ["Monitoring only: live trading is disabled until MT5 ingestion, firm-specific accounting, and the EA Guardian are verified."];
  const dailySoftStop = dailyLossUsedPct >= buffers.softStopAtPct;
  const dailyHardStop = dailyLossUsedPct >= buffers.hardStopAtPct;
  const overallDrawdownGuard = totalLossUsedPct >= buffers.overallGuardAtPct;
  if (dailySoftStop) reasons.push("Daily soft-stop threshold reached.");
  if (dailyHardStop) reasons.push("Daily hard-stop threshold reached.");
  if (overallDrawdownGuard) reasons.push("Overall drawdown guard threshold reached.");
  if (input.equity <= dailyLossLimitEquityFloor) reasons.push("Configured daily equity floor reached or breached.");
  if (input.equity <= totalLossEquityFloor) reasons.push("Configured overall equity floor reached or breached.");

  return {
    eligibleForLiveUse: false,
    accountSize: rule.accountSize,
    dailyLossUsed,
    dailyLossLimit,
    dailyLossLimitEquityFloor,
    dailyLossUsedPct,
    dailyHeadroom,
    totalLossUsed,
    totalLossLimit,
    totalLossEquityFloor,
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
