export type Candle = { time:number; open:number; high:number; low:number; close:number; volume?:number };
export type BacktestConfig = { initialBalance:number; riskPct:number; rewardRisk:number; fastEma:number; slowEma:number; maxTradesPerDay:number; spread:number; slippage:number; commissionPerUnit:number };
export type Trade = { entryTime:number; exitTime:number; side:"long"|"short"; entry:number; exit:number; stop:number; target:number; units:number; pnl:number; rMultiple:number; exitReason:"stop"|"target"|"end" };
export type BacktestResult = { config:BacktestConfig; trades:Trade[]; initialBalance:number; finalBalance:number; netPnl:number; returnPct:number; winRate:number; profitFactor:number; maxDrawdown:number; maxDrawdownPct:number; expectancyR:number; totalTrades:number; wins:number; losses:number; equity:Array<{time:number;equity:number}> };
const finite=(n:number)=>Number.isFinite(n);
export function validateCandles(input:unknown):Candle[]{
 if(!Array.isArray(input)||input.length<250||input.length>100000)throw new Error("Provide between 250 and 100,000 candles.");
 const bars=input.map((r:any)=>({time:Number(r.time),open:Number(r.open),high:Number(r.high),low:Number(r.low),close:Number(r.close),...(r.volume===undefined?{}:{volume:Number(r.volume)})}));
 for(let i=0;i<bars.length;i++){const b=bars[i];if(![b.time,b.open,b.high,b.low,b.close].every(finite)||b.time<=0||b.open<=0||b.high<=0||b.low<=0||b.close<=0||b.high<Math.max(b.open,b.close,b.low)||b.low>Math.min(b.open,b.close,b.high)||(i>0&&b.time<=bars[i-1].time))throw new Error("Invalid or unsorted candle at index "+i+".");}
 return bars;
}
export function ema(values:number[],period:number):Array<number|null>{
 if(!Number.isInteger(period)||period<2)throw new Error("EMA period must be an integer >= 2.");
 const out:Array<number|null>=Array(values.length).fill(null);if(values.length<period)return out;
 const alpha=2/(period+1);let value=values.slice(0,period).reduce((a,b)=>a+b,0)/period;out[period-1]=value;
 for(let i=period;i<values.length;i++){value=values[i]*alpha+value*(1-alpha);out[i]=value;}return out;
}
export function runEmaPullbackBacktest(bars:Candle[],c:BacktestConfig):BacktestResult{
 for(const [k,v] of Object.entries(c))if(!finite(v))throw new Error("Invalid "+k);
 if(c.initialBalance<=0||c.riskPct<=0||c.riskPct>1||c.rewardRisk<.5||c.fastEma<2||c.slowEma<=c.fastEma||c.maxTradesPerDay<1||c.maxTradesPerDay>20||c.spread<0||c.slippage<0||c.commissionPerUnit<0)throw new Error("Configuration outside safe bounds; riskPct is a percentage capped at 1%.");
 const fast=ema(bars.map(b=>b.close),c.fastEma),slow=ema(bars.map(b=>b.close),c.slowEma);
 let balance=c.initialBalance,peak=balance,maxDd=0,maxDdPct=0,position:Trade|null=null,day="",tradesToday=0;
 const trades:Trade[]=[],equity=[{time:bars[0].time,equity:balance}];
 const closePosition=(bar:Candle,raw:number,reason:Trade["exitReason"])=>{if(!position)return;const exit=raw-(position.side==="long"?c.slippage:-c.slippage);const gross=(exit-position.entry)*position.units*(position.side==="long"?1:-1);const pnl=gross-position.units*c.commissionPerUnit*2;const risk=Math.abs(position.entry-position.stop)*position.units+position.units*c.commissionPerUnit*2;position.exit=exit;position.exitTime=bar.time;position.pnl=pnl;position.rMultiple=risk>0?pnl/risk:0;position.exitReason=reason;balance+=pnl;trades.push(position);position=null;};
 for(let i=1;i<bars.length;i++){const b=bars[i],prev=bars[i-1],d=new Date(b.time*1000).toISOString().slice(0,10);if(d!==day){day=d;tradesToday=0;}
  if(position){const stop=position.side==="long"?b.low<=position.stop:b.high>=position.stop;const target=position.side==="long"?b.high>=position.target:b.low<=position.target;if(stop)closePosition(b,position.stop,"stop");else if(target)closePosition(b,position.target,"target");}
  if(!position&&tradesToday<c.maxTradesPerDay&&fast[i-1]!==null&&slow[i]!==null&&fast[i]!==null&&i>=c.slowEma+2){
   const isLong=prev.low<=fast[i-1]!&&b.close>fast[i]!&&b.close>b.open&&b.close>slow[i]!;
   const isShort=prev.high>=fast[i-1]!&&b.close<fast[i]!&&b.close<b.open&&b.close<slow[i]!;
   if(isLong||isShort){const side=isLong?"long":"short";const window=bars.slice(Math.max(0,i-5),i+1);const stop=side==="long"?Math.min(...window.map(x=>x.low)):Math.max(...window.map(x=>x.high));const entry=b.close+(side==="long"?1:-1)*(c.spread/2+c.slippage);const distance=Math.abs(entry-stop);const units=distance>0?balance*c.riskPct/100/distance:0;if(units>0&&finite(units)){const target=entry+(side==="long"?1:-1)*distance*c.rewardRisk;position={entryTime:b.time,exitTime:0,side,entry,exit:entry,stop,target,units,pnl:0,rMultiple:0,exitReason:"end"};tradesToday++;}}
  }
  const floating=position?(b.close-position.entry)*position.units*(position.side==="long"?1:-1):0;const current=balance+floating;peak=Math.max(peak,current);const dd=peak-current;maxDd=Math.max(maxDd,dd);if(peak>0)maxDdPct=Math.max(maxDdPct,dd/peak*100);equity.push({time:b.time,equity:current});
 }
 if(position)closePosition(bars[bars.length-1],bars[bars.length-1].close,"end");
 const wins=trades.filter(t=>t.pnl>0),losses=trades.filter(t=>t.pnl<0),grossWin=wins.reduce((s,t)=>s+t.pnl,0),grossLoss=Math.abs(losses.reduce((s,t)=>s+t.pnl,0)),netPnl=balance-c.initialBalance,finalPeak=Math.max(peak,balance),finalDd=finalPeak-balance;
 maxDd=Math.max(maxDd,finalDd);if(finalPeak>0)maxDdPct=Math.max(maxDdPct,finalDd/finalPeak*100);
 return {config:c,trades,initialBalance:c.initialBalance,finalBalance:balance,netPnl,returnPct:netPnl/c.initialBalance*100,winRate:trades.length?wins.length/trades.length*100:0,profitFactor:grossLoss?grossWin/grossLoss:grossWin?Infinity:0,maxDrawdown:maxDd,maxDrawdownPct:maxDdPct,expectancyR:trades.length?trades.reduce((s,t)=>s+t.rMultiple,0)/trades.length:0,totalTrades:trades.length,wins:wins.length,losses:losses.length,equity};
}
