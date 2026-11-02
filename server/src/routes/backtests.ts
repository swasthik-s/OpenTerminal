import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { runEmaPullbackBacktest, runWalkForwardEvaluation, validateCandles } from "../backtest/engine.js";

export const backtestRouter = Router();
const configSchema = z.object({
  initialBalance: z.number().positive().max(10_000_000),
  riskPct: z.number().positive().max(1),
  rewardRisk: z.number().min(0.5).max(10),
  fastEma: z.number().int().min(2).max(200),
  slowEma: z.number().int().min(3).max(500),
  maxTradesPerDay: z.number().int().min(1).max(20),
  spread: z.number().min(0).max(1000),
  slippage: z.number().min(0).max(1000),
  commissionPerUnit: z.number().min(0).max(1000),
});
const symbolSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9._-]{2,24}$/);
const timeframeSchema = z.enum(["M1", "M5", "M15", "M30", "H1", "H4", "D1"]);

backtestRouter.get("/candles/:symbol", (req, res) => {
  const symbol = symbolSchema.safeParse(req.params.symbol);
  const timeframe = timeframeSchema.safeParse(req.query.timeframe);
  if (!symbol.success || !timeframe.success) {
    return res.status(400).json({ error: "Valid symbol and timeframe are required." });
  }
  const row = db.prepare(`
    SELECT COUNT(*) AS count, MIN(time) AS firstTime, MAX(time) AS lastTime
    FROM historical_bars WHERE symbol=? AND timeframe=?
  `).get(symbol.data, timeframe.data) as { count: number; firstTime: number | null; lastTime: number | null };
  res.json({ symbol: symbol.data, timeframe: timeframe.data, ...row });
});

backtestRouter.post("/candles", (req, res) => {
  const symbol = symbolSchema.safeParse(req.body?.symbol);
  const timeframe = timeframeSchema.safeParse(req.body?.timeframe);
  if (!symbol.success || !timeframe.success) {
    return res.status(400).json({ error: "Valid symbol and timeframe are required." });
  }
  let bars;
  try {
    bars = validateCandles(req.body?.candles);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
  if (bars.length > 5000) {
    return res.status(413).json({ error: "Import at most 5,000 candles per request." });
  }
  const insert = db.prepare(`
    INSERT OR REPLACE INTO historical_bars
    (symbol,timeframe,time,open,high,low,close,volume) VALUES(?,?,?,?,?,?,?,?)
  `);
  const transaction = db.transaction((rows: typeof bars) => {
    for (const bar of rows) {
      insert.run(symbol.data, timeframe.data, bar.time, bar.open, bar.high, bar.low, bar.close, bar.volume ?? null);
    }
  });
  transaction(bars);
  res.json({
    ok: true,
    symbol: symbol.data,
    timeframe: timeframe.data,
    received: bars.length,
    firstTime: bars[0].time,
    lastTime: bars[bars.length - 1].time,
  });
});

backtestRouter.post("/run", (req, res) => {
  const symbol = symbolSchema.safeParse(req.body?.symbol);
  const timeframe = timeframeSchema.safeParse(req.body?.timeframe);
  if (!symbol.success || !timeframe.success) {
    return res.status(400).json({ error: "Valid symbol and timeframe are required." });
  }
  const parsed = configSchema.safeParse(req.body?.config);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid backtest configuration.", details: parsed.error.flatten() });
  }
  const rows = db.prepare(`
    SELECT time,open,high,low,close,volume FROM historical_bars
    WHERE symbol=? AND timeframe=? ORDER BY time ASC LIMIT 100000
  `).all(symbol.data, timeframe.data);
  if (rows.length < 250) {
    return res.status(404).json({
      error: "At least 250 stored candles are required. Import historical data first.",
      availableCandles: rows.length,
    });
  }
  try {
    const result = runEmaPullbackBacktest(rows as any, parsed.data);
    const id = randomUUID();
    db.prepare(`
      INSERT INTO backtest_runs(id,symbol,timeframe,strategy,config_json,result_json)
      VALUES(?,?,?,?,?,?)
    `).run(id, symbol.data, timeframe.data, "ema-pullback-v1", JSON.stringify(parsed.data), JSON.stringify(result));
    res.json({
      id,
      symbol: symbol.data,
      timeframe: timeframe.data,
      strategy: "ema-pullback-v1",
      data: {
        candles: rows.length,
        from: (rows[0] as any).time,
        to: (rows[rows.length - 1] as any).time,
      },
      result,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

backtestRouter.post("/evaluate", (req, res) => {
  const symbol = symbolSchema.safeParse(req.body?.symbol);
  const timeframe = timeframeSchema.safeParse(req.body?.timeframe);
  const parsed = configSchema.safeParse(req.body?.config);
  const trainPct = z.number().min(50).max(90).default(70).safeParse(req.body?.trainPct ?? 70);
  if (!symbol.success || !timeframe.success || !parsed.success || !trainPct.success) {
    return res.status(400).json({ error: "Valid symbol, timeframe, config, and trainPct (50–90) are required." });
  }
  const rows = db.prepare(`
    SELECT time,open,high,low,close,volume FROM historical_bars
    WHERE symbol=? AND timeframe=? ORDER BY time ASC LIMIT 100000
  `).all(symbol.data, timeframe.data);
  if (rows.length < 300) {
    return res.status(404).json({ error: "At least 300 stored candles are required for holdout evaluation.", availableCandles: rows.length });
  }
  try {
    const evaluation = runWalkForwardEvaluation(rows as any, parsed.data, trainPct.data);
    const id = randomUUID();
    db.prepare(`
      INSERT INTO backtest_runs(id,symbol,timeframe,strategy,config_json,result_json)
      VALUES(?,?,?,?,?,?)
    `).run(id, symbol.data, timeframe.data, "ema-pullback-v1-holdout", JSON.stringify({ ...parsed.data, trainPct: trainPct.data }), JSON.stringify(evaluation));
    res.json({
      id, symbol: symbol.data, timeframe: timeframe.data,
      data: { candles: rows.length, from: (rows[0] as any).time, to: (rows[rows.length - 1] as any).time },
      evaluation,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

backtestRouter.get("/runs", (_req, res) => {
  res.json(db.prepare("SELECT id,symbol,timeframe,strategy,created_at FROM backtest_runs ORDER BY created_at DESC LIMIT 100").all());
});

backtestRouter.get("/analytics", (req, res) => {
  const symbol = req.query.symbol === undefined ? null : symbolSchema.safeParse(req.query.symbol);
  const timeframe = req.query.timeframe === undefined ? null : timeframeSchema.safeParse(req.query.timeframe);
  if (symbol && !symbol.success) return res.status(400).json({ error: "Invalid symbol filter." });
  if (timeframe && !timeframe.success) return res.status(400).json({ error: "Invalid timeframe filter." });
  const rows = db.prepare(`
    SELECT id,symbol,timeframe,strategy,config_json,result_json,created_at
    FROM backtest_runs
    WHERE (? IS NULL OR symbol=?) AND (? IS NULL OR timeframe=?)
    ORDER BY created_at DESC LIMIT 100
  `).all(symbol?.success ? symbol.data : null, symbol?.success ? symbol.data : null, timeframe?.success ? timeframe.data : null, timeframe?.success ? timeframe.data : null) as Array<{id:string;symbol:string;timeframe:string;strategy:string;config_json:string;result_json:string;created_at:string}>;
  const runs = rows.map(row => {
    const payload = JSON.parse(row.result_json);
    const metrics = payload.outOfSample ?? payload.result ?? payload;
    return {
      id: row.id, symbol: row.symbol, timeframe: row.timeframe, strategy: row.strategy, createdAt: row.created_at,
      metrics: {
        totalTrades: Number(metrics.totalTrades ?? 0), netPnl: Number(metrics.netPnl ?? 0),
        returnPct: Number(metrics.returnPct ?? 0), winRate: Number(metrics.winRate ?? 0),
        profitFactor: metrics.profitFactor === null ? null : Number(metrics.profitFactor ?? 0),
        expectancyR: Number(metrics.expectancyR ?? 0), maxDrawdownPct: Number(metrics.maxDrawdownPct ?? 0),
      },
    };
  });
  const active = runs.filter(run => run.metrics.totalTrades > 0);
  res.json({
    count: runs.length, runs,
    aggregate: {
      runsWithTrades: active.length,
      averageReturnPct: active.length ? active.reduce((sum, run) => sum + run.metrics.returnPct, 0) / active.length : 0,
      averageExpectancyR: active.length ? active.reduce((sum, run) => sum + run.metrics.expectancyR, 0) / active.length : 0,
      positiveRuns: active.filter(run => run.metrics.netPnl > 0).length,
      negativeRuns: active.filter(run => run.metrics.netPnl < 0).length,
    },
    note: "Descriptive research history only. Runs may use different datasets, costs, and parameters; aggregate metrics are not a valid pooled performance estimate.",
  });
});

backtestRouter.get("/runs/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM backtest_runs WHERE id=?").get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: "Backtest run not found." });
  res.json({ ...row, config: JSON.parse(row.config_json), result: JSON.parse(row.result_json) });
});
