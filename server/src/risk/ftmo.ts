export type FtmoProgram="2-step"|"1-step";
export type FtmoSnapshot={program:FtmoProgram;initialCapital:number;balance:number;equity:number;dayStartBalance:number;highestClosedBalance:number;timezone?:string;now?:string};
export type FtmoAssessment={compliant:boolean;dailyFloor:number;maxLossFloor:number;dailyHeadroom:number;maxLossHeadroom:number;dailyUsedPct:number;maxLossUsedPct:number;softLock:boolean;hardLock:boolean;reasons:string[];program:FtmoProgram};
const finite=(n:number)=>Number.isFinite(n);
export function assessFtmo(s:FtmoSnapshot):FtmoAssessment{
 for(const [k,v] of Object.entries(s))if(typeof v==="number"&&!finite(v))throw new Error(k+" must be finite");
 if(s.initialCapital<=0||s.balance<0||s.equity<0||s.dayStartBalance<=0||s.highestClosedBalance<s.initialCapital)throw new Error("Invalid FTMO account snapshot");
 const dailyPct=s.program==="1-step"?3:5;
 const dailyFloor=s.dayStartBalance-s.initialCapital*dailyPct/100;
 const maxLossFloor=s.program==="1-step"?Math.max(s.initialCapital,s.highestClosedBalance)-s.initialCapital*.10:s.initialCapital*.90;
 const dailyHeadroom=s.equity-dailyFloor,maxLossHeadroom=s.equity-maxLossFloor;
 const dailyUsedPct=Math.max(0,(s.dayStartBalance-s.equity)/(s.initialCapital*dailyPct/100)*100);
 const maxLossUsedPct=Math.max(0,(Math.max(s.initialCapital,s.highestClosedBalance)-s.equity)/(s.initialCapital*.10)*100);
 const reasons:string[]=[];
 if(dailyHeadroom<=0)reasons.push("FTMO maximum daily loss breached.");
 if(maxLossHeadroom<=0)reasons.push("FTMO maximum loss breached.");
 if(dailyUsedPct>=80)reasons.push("Daily internal safety lock threshold reached (80% of FTMO daily loss allowance).");
 if(maxLossUsedPct>=80)reasons.push("Overall internal safety lock threshold reached (80% of FTMO maximum loss allowance).");
 return {compliant:dailyHeadroom>0&&maxLossHeadroom>0,dailyFloor,maxLossFloor,dailyHeadroom,maxLossHeadroom,dailyUsedPct,maxLossUsedPct,softLock:dailyUsedPct>=60||maxLossUsedPct>=60,hardLock:dailyUsedPct>=80||maxLossUsedPct>=80||dailyHeadroom<=0||maxLossHeadroom<=0,reasons,program:s.program};
}
export function copenhagenDayStartBalance(balanceAtMidnight:number,timezone="Europe/Prague"){if(!finite(balanceAtMidnight)||balanceAtMidnight<0)throw new Error("Invalid day-start balance");return balanceAtMidnight;}
