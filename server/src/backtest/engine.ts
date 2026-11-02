export type Candle = { time:number; open:number; high:number; low:number; close:number; volume?:number };
export type BacktestConfig = { initialBalance:number; riskPct:number; rewardRisk:number; fastEma:number; slowEma:number; maxTradesPerDay:number; spread:number; slippage:number; commissionPerUnit:number };
export type Trade = { entryTime:number; exitTime:number; side:"long"|"short"; entry:number; exit:number; stop:number; target:number; units:number; pnl:number; rMultiple:number; exitReason:"stop"|"target"|"end" };
export type BacktestResult = { config:BacktestConfig; trades:Trade[]; initialBalance:number; finalBalance:number; netPnl:number; returnPct:number; winRate:number; profitFactor:number|null; maxDrawdown:number; maxDrawdownPct:number; expectancyR:number; totalTrades:number; wins:number; losses:number; equity:Array<{time:number;equity:number}>; grossProfit:number; grossLoss:number; averageWin:number; averageLoss:number; largestWin:number; largestLoss:number };
const finite=(n:number)=>Number.isFinite(n);

export function validateCandles(input:unknown):Candle[]{
 if(!Array.isArray(input)||input.length<250||input.length>100000)throw new Error("Provide between 250 and 100,000 candles.");
 const bars=input.map((r:any)=>({time:Number(r.time),open:Number(r.open),high:Number(r.high),low:Number(r.low),close:Number(r.close),...(r.volume===undefined?{}:{volume:Number(r.volume)})}));
 for(let i=0;i<bars.length;i++){const b=bars[i];if(![b.time,b.open,b.high,b.low,b.close,...(b.volume===undefined?[]:[b.volume])].every(finite)||b.time<=0||b.open<=0||b.high<=0||b.low<=0||b.close<=0||(b.volume!==undefined&&b.volume<0)||b.high<Math.max(b.open,b.close,b.low)||b.low>Math.min(b.open,b.close,b.high)||(i>0&&b.time<=bars[i-1].time))throw new Error("Invalid or unsorted candle at index "+i+".");}
 return bars;
}
export function ema(values:number[],period:number):Array<number|null>{
 if(!Number.isInteger(period)||period<2)throw new Error("EMA period must be an integer >= 2.");
 const out:Array<number|null>=Array(values.length).fill(null);if(values.length<period)return out;
 const alpha=2/(period+1);let value=values.slice(0,period).reduce((a,b)=>a+b,0)/period;out[period-1]=value;
 for(let i=period;i<values.length;i++){value=values[i]*alpha+value*(1-alpha);out[i]=value;}return out;
}
export function runEmaPullbackBacktest(bars:Candle[],c:BacktestConfig,options:{startIndex?:number;endIndex?:number}={}):BacktestResult{
 if(bars.length<Math.max(250,c.slowEma+3))throw new Error("Insufficient candles for the selected slow EMA.");
 for(const [k,v] of Object.entries(c))if(!finite(v))throw new Error("Invalid "+k);
 if(c.initialBalance<=0||c.riskPct<=0||c.riskPct>1||c.rewardRisk<.5||c.fastEma<2||c.slowEma<=c.fastEma||c.maxTradesPerDay<1||c.maxTradesPerDay>20||c.spread<0||c.slippage<0||c.commissionPerUnit<0)throw new Error("Configuration outside safe bounds; riskPct is a percentage capped at 1%.");
 const start=Math.max(1,Math.floor(options.startIndex??1)),end=Math.min(bars.length-1,Math.floor(options.endIndex??bars.length-1));
 if(start>=end)throw new Error("Evaluation window must contain at least two candles.");
 const fast=ema(bars.map(b=>b.close),c.fastEma),slow=ema(bars.map(b=>b.close),c.slowEma);
 let balance=c.initialBalance,peak=balance,maxDd=0,maxDdPct=0,position:Trade|null=null,day="",tradesToday=0;
 const trades:Trade[]=[],equity=[{time:bars[start-1].time,equity:balance}];
 const closePosition=(bar:Candle,raw:number,reason:Trade["exitReason"])=>{if(!position)return;const direction=position.side==="long"?1:-1;const exit=raw-direction*c.slippage;const gross=(exit-position.entry)*position.units*direction;const pnl=gross-position.units*c.commissionPerUnit*2;const risk=(Math.abs(position.entry-position.stop)+c.slippage+c.commissionPerUnit*2)*position.units;position.exit=exit;position.exitTime=bar.time;position.pnl=pnl;position.rMultiple=risk>0?pnl/risk:0;position.exitReason=reason;balance+=pnl;trades.push(position);position=null;};
 for(let i=start;i<=end;i++){const b=bars[i],prev=bars[i-1],d=new Date(b.time*1000).toISOString().slice(0,10);if(d!==day){day=d;tradesToday=0;}
  if(position){const stop=position.side==="long"?b.low<=position.stop:b.high>=position.stop;const target=position.side==="long"?b.high>=position.target:b.low<=position.target;if(stop)closePosition(b,position.stop,"stop");else if(target)closePosition(b,position.target,"target");}
  if(!position&&tradesToday<c.maxTradesPerDay&&fast[i-1]!==null&&slow[i]!==null&&fast[i]!==null&&i>=c.slowEma+2){
   const isLong=prev.low<=fast[i-1]!&&b.close>fast[i]!&&b.close>b.open&&b.close>slow[i]!;
   const isShort=prev.high>=fast[i-1]!&&b.close<fast[i]!&&b.close<b.open&&b.close<slow[i]!;
   if(isLong||isShort){const side=isLong?"long":"short",direction=side==="long"?1:-1;const window=bars.slice(Math.max(0,i-5),i+1);const stop=side==="long"?Math.min(...window.map(x=>x.low)):Math.max(...window.map(x=>x.high));const entry=b.close+direction*(c.spread/2+c.slippage);const distance=Math.abs(entry-stop);const riskPerUnit=distance+c.slippage+c.commissionPerUnit*2;const units=riskPerUnit>0?balance*(c.riskPct/100)/riskPerUnit:0;if(units>0&&finite(units)){const target=entry+direction*distance*c.rewardRisk;position={entryTime:b.time,exitTime:0,side,entry,exit:entry,stop,target,units,pnl:0,rMultiple:0,exitReason:"end"};tradesToday++;}}
  }
  const floating=position?(b.close-position.entry)*position.units*(position.side==="long"?1:-1):0;const current=balance+floating;peak=Math.max(peak,current);const dd=peak-current;maxDd=Math.max(maxDd,dd);if(peak>0)maxDdPct=Math.max(maxDdPct,dd/peak*100);equity.push({time:b.time,equity:current});
 }
 if(position)closePosition(bars[end],bars[end].close,"end");
 equity[equity.length-1]={time:bars[end].time,equity:balance};
 const wins=trades.filter(t=>t.pnl>0),losses=trades.filter(t=>t.pnl<0),grossProfit=wins.reduce((s,t)=>s+t.pnl,0),grossLoss=Math.abs(losses.reduce((s,t)=>s+t.pnl,0)),netPnl=balance-c.initialBalance,finalPeak=Math.max(peak,balance),finalDd=finalPeak-balance;
 maxDd=Math.max(maxDd,finalDd);if(finalPeak>0)maxDdPct=Math.max(maxDdPct,finalDd/finalPeak*100);
 return {config:c,trades,initialBalance:c.initialBalance,finalBalance:balance,netPnl,returnPct:netPnl/c.initialBalance*100,winRate:trades.length?wins.length/trades.length*100:0,profitFactor:grossLoss?grossProfit/grossLoss:grossProfit?null:0,maxDrawdown:maxDd,maxDrawdownPct:maxDdPct,expectancyR:trades.length?trades.reduce((s,t)=>s+t.rMultiple,0)/trades.length:0,totalTrades:trades.length,wins:wins.length,losses:losses.length,equity,grossProfit,grossLoss,averageWin:wins.length?grossProfit/wins.length:0,averageLoss:losses.length?grossLoss/losses.length:0,largestWin:wins.length?Math.max(...wins.map(t=>t.pnl)):0,largestLoss:losses.length?Math.min(...losses.map(t=>t.pnl)):0};
}

/** Chronological holdout evaluation. Indicators are warmed with earlier bars, but no training-period trades enter test metrics. */
export function runWalkForwardEvaluation(bars:Candle[],config:BacktestConfig,trainPct=70){
 if(!Number.isFinite(trainPct)||trainPct<50||trainPct>90)throw new Error("trainPct must be between 50 and 90.");
 const split=Math.floor(bars.length*trainPct/100);
 if(split<config.slowEma+3||bars.length-split<50)throw new Error("Dataset is too small for the requested train/test split.");
 const train=runEmaPullbackBacktest(bars,config,{startIndex:1,endIndex:split-1});
 const test=runEmaPullbackBacktest(bars,{...config,initialBalance:config.initialBalance},{startIndex:split,endIndex:bars.length-1});
 return {method:"chronological-holdout",trainPct,testPct:100-trainPct,splitTime:bars[split].time,training:train,outOfSample:test,warning:"A single holdout is not proof of robustness. Include walk-forward windows, realistic broker costs, and unseen market regimes before considering deployment."};
}
