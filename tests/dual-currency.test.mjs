import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePeriod,summarizeProject,periodChart,inPeriod,fxPreview,periodLabel} from '../src/lib/reporting.ts';

const period={year:2026,mode:'year',quarter:1,month:1};
const pUSD={id:'a',name:'USD build',contract_date:'2026-02-04',contract_amount:10000,currency:'USD',amount_usd:10000,amount_egp:520000};
const pEGP={id:'b',name:'EGP build',contract_date:'2026-04-02',contract_amount:100000,currency:'EGP',amount_usd:2000,amount_egp:100000};
const transactions={
 projects:[pUSD,pEGP],
 payments:[
  {id:'p1',project_id:'a',amount:2000,amount_usd:2000,amount_egp:100000,paid_at:'2026-02-12'},
  {id:'p2',project_id:'b',amount:50000,amount_usd:1000,amount_egp:50000,paid_at:'2026-04-14'},
  {id:'p3',project_id:'a',amount:800,amount_usd:800,amount_egp:44000,paid_at:'2026-05-20'},
 ],
 expenses:[
  {id:'e1',project_id:'a',amount:500,amount_usd:500,amount_egp:26000,status:'paid',paid_at:'2026-02-14'},
  {id:'e2',project_id:'b',amount:10000,amount_usd:200,amount_egp:10000,status:'paid',paid_at:'2026-04-23'},
  {id:'e3',project_id:'a',amount:150,amount_usd:150,amount_egp:7800,status:'planned',paid_at:null}
 ],
 distributions:[]
};
test('USD and EGP contracts are both included; no currency selection',()=>{
 const s=summarizePeriod(transactions,period);
 assert.deepEqual(s.booked,{usd:12000,egp:620000});
 assert.deepEqual(s.collected,{usd:3800,egp:194000});
 assert.deepEqual(s.paidExpenses,{usd:700,egp:36000});
 assert.deepEqual(s.net,{usd:3100,egp:158000});
 assert.deepEqual(s.partner,{usd:1550,egp:79000});
 assert.equal(s.missingConversions,0);
});
test('Q1 and Q2 use contract and cash event dates rather than project creation',()=>{
 const q1=summarizePeriod(transactions,{...period,mode:'quarter',quarter:1});
 const q2=summarizePeriod(transactions,{...period,mode:'quarter',quarter:2});
 assert.deepEqual(q1.net,{usd:1500,egp:74000});
 assert.deepEqual(q2.net,{usd:1600,egp:84000});
 assert.deepEqual(q1.booked,{usd:10000,egp:520000});
 assert.deepEqual(q2.booked,{usd:2000,egp:100000});
});
test('month filter limits cash and contracts; week chart matches monthly headline',()=>{
 const month={...period,mode:'month',month:4};
 const summary=summarizePeriod(transactions,month);
 assert.deepEqual(summary.net,{usd:800,egp:40000});
 const chart=periodChart(transactions,month);
 assert.equal(chart.length,5);
 assert.equal(chart.reduce((s,x)=>s+x.revenue.usd-x.expense.usd,0),800);
});
test('a different historic FX at collection does not rewrite contracted values',()=>{
 const v=summarizeProject(transactions,'a');
 assert.deepEqual(v.contracted,{usd:10000,egp:520000});
 assert.deepEqual(v.collected,{usd:2800,egp:144000});
 assert.deepEqual(v.net,{usd:2300,egp:118000});
 const suggested=fxPreview(pUSD,800);
 assert.deepEqual(suggested,{usd:800,egp:41600}); // deliberate difference from actual 44000
});
test('unvalued records are excluded and are visibly countable',()=>{
 const w={...transactions,payments:[...transactions.payments,{id:'old',project_id:'a',paid_at:'2026-02-20',amount:100,amount_usd:null,amount_egp:null}]};
 const s=summarizePeriod(w,period);
 assert.equal(s.missingConversions,1);
 assert.deepEqual(s.net,{usd:3100,egp:158000});
});
test('year starts in 2006, quarter/date match remains calendar-based',()=>{
 assert.equal(inPeriod('2006-01-01',{year:2006,mode:'year',quarter:1,month:1}),true);
 assert.equal(inPeriod('2026-07-01',{year:2026,mode:'quarter',quarter:2,month:1}),false);
 assert.equal(inPeriod('2026-12-31',{year:2026,mode:'quarter',quarter:4,month:1}),true);
 assert.equal(periodLabel({...period,mode:'quarter',quarter:3}), 'Q3 · 2026');
});

test('transactions may carry a different user-confirmed rate than project FX',()=>{
 const projectFx=fxPreview(pUSD,800);
 assert.equal(projectFx.egp,41600);
 const originalPayment=transactions.payments.find(x=>x.id==='p3');
 assert.equal(originalPayment.amount_egp,44000);
 assert.notEqual(originalPayment.amount_egp,projectFx.egp);
});
