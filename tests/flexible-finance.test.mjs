import test from 'node:test';
import assert from 'node:assert/strict';
import {splitRatios,shareAmounts,validateManualShares,partnerNativeShare} from '../src/lib/partnerSplit.ts';
import {projectFinance} from '../src/lib/finance.ts';
import {summarizePeriod,summarizeProject} from '../src/lib/reporting.ts';

const p=(updates={})=>({id:'p',contract_date:'2026-02-01',contract_amount:70000,currency:'EGP',amount_usd:1400,amount_egp:70000,split_mode:'amount',mina_contract_share:50000,bishoy_contract_share:20000,mina_percent:71.4286,bishoy_percent:28.5714,...updates});
const payment=(id,amount,date)=>({id,project_id:'p',amount,amount_usd:amount/50,amount_egp:amount,paid_at:date,receiver_type:'company'});
const base={projects:[p()],payments:[payment('a',5000,'2026-02-01'),payment('b',2000,'2026-03-01')],expenses:[],distributions:[]};
test('manual contract split 50k/20k is 5/7 vs 2/7, not 50/50',()=>{
 const r=splitRatios(p());assert.equal(r.mina,5/7);assert.equal(r.bishoy,2/7);
 assert.equal(partnerNativeShare(p(),'mina'),50000);
 assert.equal(partnerNativeShare(p(),'bishoy'),20000);
});
test('100%/0% custom percent gives whole net to Mina',()=>{
 const project=p({split_mode:'percentage',mina_percent:100,bishoy_percent:0});
 const f=projectFinance(project,base.payments,[],[]);
 assert.equal(f.mina.profit,7000);assert.equal(f.bishoy.profit,0);
});
test('partial payments accumulate and reduce lifetime outstanding',()=>{
 const f=projectFinance(p({contract_amount:10000,mina_contract_share:5000,bishoy_contract_share:5000}),base.payments,[],[]);
 assert.equal(f.collected,7000);assert.equal(f.outstanding,3000);
});
test('percentage split always allocates original currency in cents',()=>{
 assert.deepEqual(shareAmounts(70000,70),{mina:49000,bishoy:21000});
 assert.deepEqual(shareAmounts(100,33.33),{mina:33.33,bishoy:66.67});
});
test('invalid manual allocations rejected before saving',()=>{
 assert.equal(validateManualShares(70000,50000,20000),true);
 assert.equal(validateManualShares(70000,50000,18000),false);
 assert.equal(validateManualShares(70000,-1,70001),false);
});
test('realized per-project split uses signed contract ratio for both native and dual amounts',()=>{
 const w={...base,expenses:[{id:'e',project_id:'p',amount:2000,amount_usd:40,amount_egp:2000,status:'paid',paid_at:'2026-03-10',paid_by:'mina'}]};
 const f=summarizeProject(w,'p');
 assert.equal(f.net.egp,5000);assert.equal(f.partnerMina.egp,5000*5/7);assert.ok(Math.abs(f.partnerBishoy.egp-5000*2/7)<0.000001);
 assert.equal(f.remaining.egp,63000);
 const n=projectFinance(p(),w.payments,w.expenses,[]);assert.equal(n.mina.reimbursementDue,2000);
});
test('period partner totals aggregate each project proportions',()=>{
 const w={...base,projects:[p(),p({id:'q',contract_date:'2026-02-01',split_mode:'percentage',mina_percent:0,bishoy_percent:100,mina_contract_share:0,bishoy_contract_share:70000})],payments:[...base.payments,{...payment('c',3000,'2026-03-10'),project_id:'q'}]};
 const f=summarizePeriod(w,{year:2026,mode:'year',quarter:1,month:1});
 assert.equal(f.partnerMina.egp,5000);assert.equal(f.partnerBishoy.egp,5000);
});
test('outstanding is converted at signed contract FX, not the changing receipt-day FX',()=>{
 const project=p({contract_amount:10000,amount_usd:200,amount_egp:10000,mina_contract_share:5000,bishoy_contract_share:5000});
 const receipts=[{...payment('a',10000,'2026-03-01'),amount_usd:250}];
 const v=summarizeProject({projects:[project],payments:receipts,expenses:[],distributions:[]},'p');
 assert.deepEqual(v.remaining,{usd:0,egp:0});
 assert.equal(v.collected.usd,250);
});
