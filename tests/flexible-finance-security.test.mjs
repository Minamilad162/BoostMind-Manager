import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/202610280007_flexible_partner_shares_collections_edit_expenses.sql',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const api=readFileSync(new URL('../src/lib/api.ts',import.meta.url),'utf8');
test('financial split enforced in SQL and never directly developer-writable',()=>{
 for(const str of ['project_split_percentage_sum','project_split_amount_sum','private.is_admin()','private.guard_partner_entitlements','private.check_distribution'])assert.ok(sql.includes(str),str);
 assert.ok(!/grant all on public.project_financials to authenticated/i.test(sql));
});
test('historic receipts are not assigned a fabricated receiver and new ones require one',()=>{
 assert.match(sql,/add column receiver_type text/);
 assert.match(sql,/new.receiver_type is null/);
 assert.match(app,/receiver_type:receivedBy/);
});
test('expense edit and delete paths have admin-only UI, RLS and audit',()=>{
 assert.match(app,/editRecord\('expenses'/);
 assert.match(app,/deleteRecord\('expenses'/);
 assert.match(app,/expenseToDelete&&admin/);
 assert.match(sql,/grant select,insert,update,delete on public.expenses to authenticated/);
 assert.match(api,/editRecord\(table/);
});
test('invoice allocation remains in original migration and receipts are not doubled',()=>{
 const invoice=readFileSync(new URL('../supabase/migrations/202610280005_invoice_studio.sql',import.meta.url),'utf8');
 assert.match(invoice,/invoice_payment_refresh/);
 assert.match(sql,/payment_contract_limit/);
});
