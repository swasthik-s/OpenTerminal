import { z } from "zod";

/**
 * Prop-firm rules are data, not application constants.
 * Schema validation checks structure only; official terms still require review.
 */
export const PropRuleSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-z0-9][a-z0-9-]*$/),
  firm: z.string().min(1).max(80),
  program: z.string().min(1).max(120),
  accountSize: z.number().positive().finite(),
  phases: z.array(z.object({
    name: z.string().min(1).max(80),
    profitTargetPct: z.number().min(0).max(100).finite(),
    minTradingDays: z.number().int().min(0).max(365),
  }).strict()).min(1),
  maxDailyLossPct: z.number().positive().max(100).finite(),
  maxTotalLossPct: z.number().positive().max(100).finite(),
  drawdownType: z.enum(["static", "trailing"]),
  dailyResetTimezone: z.string().min(1).max(80),
  dailyLossBasis: z.enum(["balance", "equity-incl-floating"]),
  /** Optional consistency objective, e.g. FTMO 1-Step Best Day Rule. */
  bestDayRulePct: z.number().positive().max(100).finite().optional(),
  newsRestrictionMinutes: z.number().int().min(0).max(1440),
  eaAllowed: z.boolean(),
  eaRestrictions: z.array(z.string().max(300)).max(30),
  sourceUrl: z.string().url(),
  lastVerified: z.string().min(1).refine((value) => value !== "VERIFY", {
    message: "Rule file requires explicit verification against official terms",
  }),
}).strict();

export type PropRule = z.infer<typeof PropRuleSchema>;

export function parsePropRule(input: unknown): PropRule {
  return PropRuleSchema.parse(input);
}
