import { describe, expect, it } from "vitest";
import { calculateRiskStatus } from "./engine.js";
import { parsePropRule } from "../rules/schema.js";
import ftmo from "../rules/ftmo-2step-100k.json";

const rule = parsePropRule({
  ...ftmo,
  dailyResetTimezone: "Europe/Prague",
  lastVerified: "2026-10-29",
});

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
  it("calculates provisional daily loss and headroom from supplied P/L values", () => {
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

  it("flags hard stop and overall drawdown guard with conservative buffers", () => {
    const result = calculateRiskStatus(rule, {
      ...baseInput,
      dailyClosedPnl: -4_000,
      balance: 92_000,
      equity: 91_000,
    }, buffers);
    expect(result.dailyHardStop).toBe(true);
    expect(result.overallDrawdownGuard).toBe(true);
  });

  it("calculates phase target progress and phase-specific minimum days", () => {
    const verification = calculateRiskStatus(rule, {
      ...baseInput,
      phaseIndex: 1,
      phaseClosedProfit: 2_500,
      tradingDays: 2,
    }, buffers);
    expect(verification.phaseProfitTarget).toBe(5_000);
    expect(verification.phaseProfitProgressPct).toBe(50);
    expect(verification.minimumTradingDays).toBe(4);
  });

  it("rejects unverified trailing-drawdown calculation", () => {
    const trailingRule = parsePropRule({
      ...rule,
      id: "test-trailing",
      drawdownType: "trailing",
    });
    expect(() => calculateRiskStatus(trailingRule, baseInput, buffers))
      .toThrow(/high-water-mark/);
  });

  it("rejects bad buffers and out-of-range phase indices", () => {
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
    expect(() => parsePropRule(ftmo)).toThrow();
  });
});
