import { z } from "zod";
export const StrategySchema=z.object({
 name:z.string().min(3).max(100),
 symbol:z.string().regex(/^[A-Z0-9._-]{2,24}$/),
 timeframe:z.enum(["M1","M5","M15","M30","H1","H4","D1"]),
 kind:z.literal("ema-pullback-v1"),
 fastEma:z.number().int().min(2).max(200),
 slowEma:z.number().int().min(3).max(500),
 riskPct:z.number().positive().max(1),
 rewardRisk:z.number().min(.5).max(10),
 maxTradesPerDay:z.number().int().min(1).max(5),
 spread:z.number().min(0).max(1000),
 slippage:z.number().min(0).max(1000),
 commissionPerUnit:z.number().min(0).max(1000),
 rationale:z.string().max(1500)
}).strict().refine(v=>v.slowEma>v.fastEma,{message:"slowEma must exceed fastEma"});
export type StrategySpec=z.infer<typeof StrategySchema>;
export function compileStrategy(s:StrategySpec,initialBalance:number){
 if(!Number.isFinite(initialBalance)||initialBalance<=0||initialBalance>10000000)throw new Error("Invalid initial balance");
 return {initialBalance,riskPct:s.riskPct,rewardRisk:s.rewardRisk,fastEma:s.fastEma,slowEma:s.slowEma,maxTradesPerDay:s.maxTradesPerDay,spread:s.spread,slippage:s.slippage,commissionPerUnit:s.commissionPerUnit};
}
