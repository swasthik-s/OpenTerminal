import {describe,it,expect} from "vitest";
import {assessFtmo} from "./ftmo.js";
describe("FTMO risk governor",()=>{
 it("uses 2-step 5% daily and 10% static max loss on 100k",()=>{const r=assessFtmo({program:"2-step",initialCapital:100000,balance:100000,equity:97000,dayStartBalance:100000,highestClosedBalance:100000});expect(r.dailyFloor).toBe(95000);expect(r.maxLossFloor).toBe(90000);expect(r.compliant).toBe(true);});
 it("locks before the FTMO breach at 80% daily loss",()=>{const r=assessFtmo({program:"2-step",initialCapital:100000,balance:96000,equity:96000,dayStartBalance:100000,highestClosedBalance:100000});expect(r.hardLock).toBe(true);expect(r.compliant).toBe(true);});
 it("uses 1-step 3% daily and 10% closed-balance trailing maximum loss",()=>{const r=assessFtmo({program:"1-step",initialCapital:100000,balance:104000,equity:103000,dayStartBalance:104000,highestClosedBalance:105000});expect(r.dailyFloor).toBe(101000);expect(r.maxLossFloor).toBe(95000);});
 it("blocks breached account",()=>{const r=assessFtmo({program:"2-step",initialCapital:100000,balance:94000,equity:94000,dayStartBalance:100000,highestClosedBalance:100000});expect(r.compliant).toBe(false);expect(r.hardLock).toBe(true);});
});
