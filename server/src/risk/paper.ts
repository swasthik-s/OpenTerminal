import {randomUUID} from "node:crypto";
import {db} from "../db.js";
import {assessFtmo,FtmoProgram} from "./ftmo.js";
export type PaperOrder={id:string;symbol:string;side:"BUY"|"SELL";quantity:number;entry:number;stop:number;target:number;status:"OPEN"|"CLOSED";pnl:number;createdAt:string;closedAt?:string};
export function getPaperAccount(){return db.prepare("SELECT * FROM paper_accounts WHERE id='ftmo-demo'").get() as any;}
export function ensurePaperAccount(program:FtmoProgram,capital:number){
 if(!["1-step","2-step"].includes(program)||!Number.isFinite(capital)||capital<=0)throw new Error("Invalid paper account configuration");
 db.prepare("INSERT OR IGNORE INTO paper_accounts(id,firm,program,initial_capital,balance,equity,day_start_balance,highest_closed_balance,locked) VALUES('ftmo-demo','FTMO',?,?,?,?,?,?,0)").run(program,capital,capital,capital,capital,capital);
 const a=getPaperAccount();if(a.program!==program||a.initial_capital!==capital)throw new Error("Paper account already exists with different settings; reset it explicitly before reconfiguration");
 return a;
}
export function assessPaperAccount(){const a=getPaperAccount();if(!a)throw new Error("Create the FTMO demo paper account first");return assessFtmo({program:a.program,initialCapital:a.initial_capital,balance:a.balance,equity:a.equity,dayStartBalance:a.day_start_balance,highestClosedBalance:a.highest_closed_balance});}
export function placePaperOrder(input:{symbol:string;side:"BUY"|"SELL";quantity:number;entry:number;stop:number;target:number}){
 const a=getPaperAccount();if(!a)throw new Error("Paper account not initialized");
 if(a.locked)throw new Error("Paper trading is locked");
 const risk=assessPaperAccount();if(risk.hardLock||!risk.compliant) {db.prepare("UPDATE paper_accounts SET locked=1 WHERE id='ftmo-demo'").run();throw new Error("Risk Governor blocked order: "+risk.reasons.join(" "));}
 const {symbol,side,quantity,entry,stop,target}=input;
 if(!/^[A-Z0-9._-]{2,24}$/.test(symbol)||![quantity,entry,stop,target].every(Number.isFinite)||quantity<=0||entry<=0||stop<=0||target<=0)throw new Error("Invalid order values");
 if((side==="BUY"&&(stop>=entry||target<=entry))||(side==="SELL"&&(stop<=entry||target>=entry)))throw new Error("Stop and target must be on correct sides of entry");
 const riskCash=Math.abs(entry-stop)*quantity;
 if(riskCash>a.initial_capital*.0025)throw new Error("Paper order risk exceeds 0.25% of initial account capital.");
 const id=randomUUID();db.prepare("INSERT INTO paper_orders(id,symbol,side,quantity,entry,stop,target,status,pnl) VALUES(?,?,?,?,?,?,?,'OPEN',0)").run(id,symbol,side,quantity,entry,stop,target);return db.prepare("SELECT * FROM paper_orders WHERE id=?").get(id);
}
export function closePaperOrder(id:string,exit:number){
 const o=db.prepare("SELECT * FROM paper_orders WHERE id=? AND status='OPEN'").get(id) as any;if(!o)throw new Error("Open paper order not found");if(!Number.isFinite(exit)||exit<=0)throw new Error("Invalid exit price");
 const pnl=(exit-o.entry)*o.quantity*(o.side==="BUY"?1:-1);const a=getPaperAccount();const balance=a.balance+pnl;const highest=Math.max(a.highest_closed_balance,balance);
 db.transaction(()=>{db.prepare("UPDATE paper_orders SET status='CLOSED',pnl=?,closed_at=datetime('now') WHERE id=?").run(pnl,id);db.prepare("UPDATE paper_accounts SET balance=?,equity=?,highest_closed_balance=? WHERE id='ftmo-demo'").run(balance,balance,highest);})();
 return {id,pnl,balance,equity:balance};
}
export function resetPaperAccount(){db.transaction(()=>{db.prepare("DELETE FROM paper_orders").run();db.prepare("DELETE FROM paper_accounts WHERE id='ftmo-demo'").run();})();}
