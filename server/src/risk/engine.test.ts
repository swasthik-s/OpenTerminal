import { describe, expect, it } from "vitest";
import { calculateRiskStatus } from "./engine.js";
import { parsePropRule } from "../rules/schema.js";
import ftmo from "../rules/ftmo-2step-100k.json";

const rule = parsePropRule({
  ...ftmo,
  dailyResetTimezone: "UTC",
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
  tradingDays: 0,
};

describe("calculateRiskStatus", () => {
  it("calculates daily loss and headroom using realized and floating P/L", () => {
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

  it("computes phase target progress and minimum days", () => {
    const result = calculateRiskStatus(rule, {
      ...baseInput,
      phaseClosedProfit: 5_000,
      tradingDays: 2,
    }, buffers);
    expect(result.phaseProfitTarget).toBe(10_000);
    expect(result.phaseProfitProgressPct).toBe(50);
    expect(result.minimumTradingDays).toBe(4);
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

  it("rejects invalid buffer order and limits", () => {
    expect(() => calculateRiskStatus(rule, baseInput, {
      softStopAtPct: 80, hardStopAtPct: 60, overallGuardAtPct: 80,
    })).toThrow(/below hard-stop/);
    expect(() => calculateRiskStatus(rule, baseInput, {
      softStopAtPct: 100, hardStopAtPct: 101, overallGuardAtPct: 80,
    })).toThrow(/greater than 0/);
  });

  it("cannot treat VERIFY placeholders as a verified rule", () => {
    expect(() => parsePropRule(ftmo)).toThrow();
  });
});
