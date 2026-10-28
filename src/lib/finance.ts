import type {Currency, Distribution, Expense, Payment, Project, Task} from './types';
export type ProjectFinance = {contracted:number;collected:number;paidExpenses:number;plannedExpenses:number;net:number;mina:{profit:number;contributed:number;distributed:number;reimbursed:number;profitDue:number;reimbursementDue:number};bishoy:{profit:number;contributed:number;distributed:number;reimbursed:number;profitDue:number;reimbursementDue:number}};
export function projectFinance(project:Project,payments:Payment[],expenses:Expense[],distributions:Distribution[]):ProjectFinance {
 const collected=payments.filter(p=>p.project_id===project.id).reduce((s,p)=>s+Number(p.amount),0);
 const scoped=expenses.filter(e=>e.project_id===project.id);
 const paidExpenses=scoped.filter(e=>e.status==='paid').reduce((s,e)=>s+Number(e.amount),0);
 const plannedExpenses=scoped.filter(e=>e.status==='planned').reduce((s,e)=>s+Number(e.amount),0);
 const net=collected-paidExpenses;
 const partner=(code:'mina'|'bishoy')=>{const contributed=scoped.filter(e=>e.status==='paid'&&e.paid_by===code).reduce((s,e)=>s+Number(e.amount),0);const allocated=distributions.filter(d=>d.project_id===project.id&&d.partner_code===code);const distributed=allocated.filter(d=>d.kind==='profit').reduce((s,d)=>s+Number(d.amount),0);const reimbursed=allocated.filter(d=>d.kind==='reimbursement').reduce((s,d)=>s+Number(d.amount),0);const profit=net/2;return {profit,contributed,distributed,reimbursed,profitDue:profit-distributed,reimbursementDue:contributed-reimbursed};};
 return {contracted:Number(project.contract_amount),collected,paidExpenses,plannedExpenses,net,mina:partner('mina'),bishoy:partner('bishoy')};
}
export const money=(n:number,currency:Currency|string='EGP')=>new Intl.NumberFormat('en-EG',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(n)||0)+' '+currency;
export const shortDate=(d:string|null|undefined)=>d?new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
export const taskProgress=(tasks:Task[],id:string)=>{const rows=tasks.filter(t=>t.project_id===id);return rows.length?Math.round(rows.filter(t=>t.status==='done').length/rows.length*100):0;};
export function fyFor(date:string,startMonth=1){const d=new Date(date+'T12:00:00');return d.getFullYear()+(d.getMonth()+1>=startMonth?0:-1);}
export function inFY(date:string,fy:number,startMonth=1){return fyFor(date.slice(0,10),startMonth)===fy;}
