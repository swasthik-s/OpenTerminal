import {Router} from "express";
import {Anthropic} from "@anthropic-ai/sdk";
import {randomUUID} from "node:crypto";
import {db} from "../db.js";
import {StrategySchema,compileStrategy} from "../strategy/schema.js";
import {runEmaPullbackBacktest} from "../backtest/engine.js";
export const strategyRouter=Router();
const guide="Translate a plain English trading strategy into a restricted JSON specification. Only EMA pullback strategies are supported at present. Do not pretend other strategies are implemented. Output ONLY JSON with keys name,symbol,timeframe,kind,fastEma,slowEma,riskPct,rewardRisk,maxTradesPerDay,spread,slippage,commissionPerUnit,rationale. kind must be ema-pullback-v1. If user asks for a different strategy, return JSON with error explaining unsupported strategy. Never claim returns or profitability. RiskPct <= 1. Do not invent broker-specific spreads; use 0 and explain costs require calibration.";
strategyRouter.post("/draft",async(req,res)=>{
 const prompt=String(req.body?.prompt??"").trim();
 if(prompt.length<15||prompt.length>4000)return res.status(400).json({error:"Strategy description must be 15–4,000 characters."});
 if(!process.env.ANTHROPIC_API_KEY)return res.status(503).json({error:"Configure ANTHROPIC_API_KEY on the server."});
 try{
 const client=new Anthropic({apiKey:process.env.ANTHROPIC_API_KEY});
 const response=await client.messages.create({model:process.env.ANTHROPIC_MODEL??"claude-sonnet-4-5",max_tokens:1300,system:guide,messages:[{role:"user",content:prompt}]});
 const raw=response.content.filter(b=>b.type==="text").map(b=>b.text).join("").trim().replace(/^\x60\x60\x60(?:json)?\s*/,"").replace(/\s*\x60\x60\x60$/,"");
 const obj=JSON.parse(raw);
 if(obj.error)return res.status(422).json({error:String(obj.error)});
 const parsed=StrategySchema.safeParse(obj);
 if(!parsed.success)return res.status(422).json({error:"AI output did not pass executable strategy validation.",details:parsed.error.flatten()});
 res.json({strategy:parsed.data,executable:true,liveEligible:false,requiresApproval:true});
 }catch(e){res.status(502).json({error:"Strategy drafting failed.",detail:(e as Error).message});}
});
strategyRouter.post("/experiments", (req,res)=>{
 const parsed=StrategySchema.safeParse(req.body?.strategy);
 if(!parsed.success)return res.status(400).json({error:"Invalid strategy specification",details:parsed.error.flatten()});
 const hypothesis=String(req.body?.hypothesis??"").slice(0,2000);
 const id=randomUUID(),s=parsed.data;
 db.prepare("INSERT INTO strategy_experiments(id,name,hypothesis,strategy,config_json,status) VALUES(?,?,?,?,?,?)").run(id,s.name,hypothesis,s.kind,JSON.stringify(s),"draft");
 res.status(201).json({id,status:"draft",strategy:s});
});
strategyRouter.get("/experiments",(_req,res)=>res.json(db.prepare("SELECT id,name,hypothesis,strategy,status,created_at,updated_at FROM strategy_experiments ORDER BY created_at DESC LIMIT 100").all()));
strategyRouter.post("/experiments/:id/backtest",(req,res)=>{
 const row=db.prepare("SELECT * FROM strategy_experiments WHERE id=?").get(req.params.id) as any;
 if(!row)return res.status(404).json({error:"Experiment not found"});
 const s=StrategySchema.parse(JSON.parse(row.config_json));
 const rows=db.prepare("SELECT time,open,high,low,close,volume FROM historical_bars WHERE symbol=? AND timeframe=? ORDER BY time LIMIT 100000").all(s.symbol,s.timeframe);
 if(rows.length<250)return res.status(409).json({error:"Import at least 250 historical candles before backtesting",availableCandles:rows.length});
 try{
 const config=compileStrategy(s,Number(req.body?.initialBalance??100000));
 const result=runEmaPullbackBacktest(rows as any,config),id=randomUUID();
 db.prepare("INSERT INTO backtest_runs(id,symbol,timeframe,strategy,config_json,result_json) VALUES(?,?,?,?,?,?)").run(id,s.symbol,s.timeframe,s.kind,JSON.stringify(config),JSON.stringify(result));
 db.prepare("UPDATE strategy_experiments SET status='backtested',updated_at=datetime('now') WHERE id=?").run(req.params.id);
 res.json({id,experimentId:req.params.id,liveEligible:false,backtest:result});
 }catch(e){res.status(400).json({error:(e as Error).message});}
});
