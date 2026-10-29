import { describe, expect, it } from "vitest";
import { calculateRiskStatus } from "./engine.js";
import { parsePropRule } from "../rules/schema.js";
import ftmo2Step from "../rules/ftmo-2step-100k.json";
import ftmo1Step from "../rules/ftmo-1step-100k.json";

const rule = parsePropRule({
  ...ftmo2Step,
  dailyResetTimezone: "Europe/Prague",
  lastVerified: "2026-10-29",
});
const oneStepRule = parsePropRule(ftmo1Step);
const buffers = { softStopAtPct: 60, hardStopAtPct: 80, overallGuardAtPct: 80 };
const baseInput = {
  startingBalance: 100_000,
  balance: 100_000,
  equity: 100_000,
  dailyClosedPnl: 0,
  floatingPnl: 0,
  additionalCosts: 0,
  phaseClosedProfit: 0,
  phaseIndex: 0,
  tradingDays: 0,
};

describe("calculateRiskStatus", () => {
  it("calculates static-program daily loss and headroom from supplied P/L", () => {
    const result = calculateRiskStatus(rule, {
      ...baseInput,
      dailyClosedPnl: -2_000,
      floatingPnl: -1_000,
      additionalCosts: 100,
    }, buffers);
    expect(result.dailyLossLimit).toBe(5_000);
    expect(result.dailyLossUsed).toBe(3_100);
    expect(result.dailyHeadroom).toBe(1_900);
    expect(result.dailySoftStop).toBe(true);
    expect(result.dailyHardStop).toBe(false);
    expect(result.eligibleForLiveUse).toBe(false);
  });

  it("flags hard stop and overall drawdown guard", () => {
    const result = calculateRiskStatus(rule, {
      ...baseInput,
      dailyClosedPnl: -4_000,
      equity: 91_000,
    }, buffers);
    expect(result.dailyHardStop).toBe(true);
    expect(result.overallDrawdownGuard).toBe(true);
  });

  it("calculates phase target progress and phase-specific minimum days", () => {
    const result = calculateRiskStatus(rule, {
      ...baseInput,
      phaseIndex: 1,
      phaseClosedProfit: 2_500,
      tradingDays: 2,
    }, buffers);
    expect(result.phaseProfitTarget).toBe(5_000);
    expect(result.phaseProfitProgressPct).toBe(50);
    expect(result.minimumTradingDays).toBe(4);
  });

  it("requires broker-sourced reset and EOD high-water balances for trailing rules", () => {
    expect(() => calculateRiskStatus(oneStepRule, baseInput, buffers))
      .toThrow(/dailyResetBalance and highestEndOfDayBalance/);
  });

  it("calculates FTMO 1-Step daily and EOD trailing equity floors", () => {
    const result = calculateRiskStatus(oneStepRule, {
      ...baseInput,
      balance: 103_000,
      equity: 96_500,
      dailyResetBalance: 102_000,
      highestEndOfDayBalance: 104_000,
      phaseClosedProfit: 3_000,
    }, buffers);
    expect(result.dailyLossLimit).toBe(3_000);
    expect(result.dailyLossLimitEquityFloor).toBe(99_000);
    expect(result.dailyLossUsed).toBe(5_500);
    expect(result.totalLossLimit).toBe(10_000);
    expect(result.totalLossEquityFloor).toBe(94_000);
    expect(result.totalLossUsed).toBe(7_500);
    expect(result.phaseProfitTarget).toBe(10_000);
    expect(result.phaseProfitProgressPct).toBe(30);
    expect(result.eligibleForLiveUse).toBe(false);
  });

  it("rejects invalid buffers and phase indices", () => {
    expect(() => calculateRiskStatus(rule, baseInput, {
      softStopAtPct: 80, hardStopAtPct: 60, overallGuardAtPct: 80,
    })).toThrow(/below hard-stop/);
    expect(() => calculateRiskStatus(rule, baseInput, {
      softStopAtPct: 100, hardStopAtPct: 101, overallGuardAtPct: 80,
    })).toThrow(/greater than 0/);
    expect(() => calculateRiskStatus(rule, { ...baseInput, phaseIndex: 9 }, buffers))
      .toThrow(/phaseIndex/);
  });

  it("rejects rule files that still contain VERIFY placeholders", () => {
    expect(() => parsePropRule(ftmo2Step)).toThrow();
  });
});
