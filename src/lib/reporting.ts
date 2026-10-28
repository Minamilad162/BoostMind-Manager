import type {Expense, Payment, Project, Workspace} from './types';

/** Amounts are immutable user-confirmed transaction snapshots; NEVER fetch or assume a live FX rate. */
export type DualAmount = { usd: number; egp: number };
export type ReportingPeriod = { year: number; mode: 'year' | 'quarter' | 'month'; quarter: 1|2|3|4; month: number };
export const ZERO_DUAL: DualAmount = {usd: 0, egp: 0};
export function hasDual(value: {amount_usd?: number|null; amount_egp?: number|null}): boolean {
  return value.amount_usd != null && value.amount_egp != null && Number.isFinite(Number(value.amount_usd)) && Number.isFinite(Number(value.amount_egp));
}
export function dual(value: {amount_usd?: number|null; amount_egp?: number|null}): DualAmount {
  return { usd: Number(value.amount_usd ?? 0), egp: Number(value.amount_egp ?? 0) };
}
export function addDual(a: DualAmount,b:DualAmount): DualAmount { return {usd:a.usd+b.usd,egp:a.egp+b.egp}; }
export function subDual(a: DualAmount,b:DualAmount): DualAmount { return {usd:a.usd-b.usd,egp:a.egp-b.egp}; }
export function halfDual(a:DualAmount):DualAmount {return {usd:a.usd/2,egp:a.egp/2};}
export function inPeriod(date:string|null|undefined,period:ReportingPeriod):boolean {
  if(!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) return false;
  const y=Number(date.slice(0,4)),m=Number(date.slice(5,7));
  if(y!==period.year) return false;
  if(period.mode==='quarter') return Math.ceil(m/3)===period.quarter;
  if(period.mode==='month') return m===period.month;
  return true;
}
export function periodLabel(period:ReportingPeriod):string {
  return period.mode==='year'?`Year ${period.year}`:period.mode==='quarter'?`Q${period.quarter} · ${period.year}`:
    `${new Date(2024,period.month-1,1).toLocaleString('en-US',{month:'long'})} ${period.year}`;
}
export function fxPreview(project: Project | undefined,amount:number):DualAmount | null {
  if(!project || !Number.isFinite(amount) || !Number.isFinite(project.contract_amount) || project.contract_amount<=0 || !hasDual(project)) return null;
  return {usd:Math.round(amount*Number(project.amount_usd)/project.contract_amount*100)/100,
    egp:Math.round(amount*Number(project.amount_egp)/project.contract_amount*100)/100};
}
export interface PeriodSummary {
  booked:DualAmount;collected:DualAmount;paidExpenses:DualAmount;net:DualAmount;partner:DualAmount;
  missingConversions:number;
  projects:Project[];receipts:Payment[];expenses:Expense[];
}
export function summarizePeriod(w:Workspace,period:ReportingPeriod):PeriodSummary {
  let booked={...ZERO_DUAL}, collected={...ZERO_DUAL}, paidExpenses={...ZERO_DUAL}, missingConversions=0;
  const projects=w.projects.filter(p=>inPeriod(p.contract_date,period));
  for (const p of projects) {if(hasDual(p)) booked=addDual(booked,dual(p));else missingConversions++;}
  const receipts=w.payments.filter(p=>inPeriod(p.paid_at,period));
  for(const p of receipts){if(hasDual(p))collected=addDual(collected,dual(p));else missingConversions++;}
  const expenses=w.expenses.filter(e=>e.status==='paid'&&inPeriod(e.paid_at,period));
  for(const e of expenses){if(hasDual(e)) paidExpenses=addDual(paidExpenses,dual(e)); else missingConversions++;}
  const net=subDual(collected,paidExpenses);
  return {booked,collected,paidExpenses,net,partner:halfDual(net),missingConversions,projects,receipts,expenses};
}
/** Reconciles the project's lifetime figures using original recorded FX, not today's rate. */
export function summarizeProject(w:Workspace,projectId:string){
  const p=w.projects.find(p=>p.id===projectId);
  let contracted={...ZERO_DUAL},collected={...ZERO_DUAL},paidExpenses={...ZERO_DUAL},planned={...ZERO_DUAL},missingConversions=0;
  if(p) {if(hasDual(p)) contracted=dual(p);else missingConversions++;}
  for(const r of w.payments.filter(x=>x.project_id===projectId)){if(hasDual(r)) collected=addDual(collected,dual(r));else missingConversions++;}
  for(const e of w.expenses.filter(x=>x.project_id===projectId)) {if(!hasDual(e)){missingConversions++;continue;}if(e.status==='paid')paidExpenses=addDual(paidExpenses,dual(e));else planned=addDual(planned,dual(e));}
  const net=subDual(collected,paidExpenses);
  return {contracted,collected,paidExpenses,planned,net,partner:halfDual(net),missingConversions};
}
/** Chart groups use the same period definition and converted snapshots as headline KPIs. */
export function periodChart(w:Workspace,p:ReportingPeriod){
  const groups=p.mode==='year'?Array.from({length:12},(_,i)=>i+1):p.mode==='quarter'?Array.from({length:3},(_,i)=>(p.quarter-1)*3+i+1):Array.from({length:Math.ceil(new Date(p.year,p.month,0).getDate()/7)},(_,i)=>i+1);
  return groups.map(group=>{
    const label=p.mode==='month'?`Week ${group}`:new Date(2024,group-1,1).toLocaleString('en-US',{month:'short'});
    const fits=(date:string|null|undefined)=>inPeriod(date,p) && (p.mode==='month'?Math.ceil(Number(date!.slice(8,10))/7)===group:Number(date!.slice(5,7))===group);
    const receiptRows=w.payments.filter(x=>fits(x.paid_at)&&hasDual(x));
    const expenseRows=w.expenses.filter(x=>x.status==='paid'&&fits(x.paid_at)&&hasDual(x));
    return {name:label, revenue:receiptRows.reduce((a,x)=>addDual(a,dual(x)),{...ZERO_DUAL}),expense:expenseRows.reduce((a,x)=>addDual(a,dual(x)),{...ZERO_DUAL})};
  });
}
