import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/202610280001_initial.sql',import.meta.url),'utf8');
const simple=readFileSync(new URL('../supabase/migrations/202610280003_simple_credentials.sql',import.meta.url),'utf8');
const api=readFileSync(new URL('../src/lib/api.ts',import.meta.url),'utf8');
test('Project value is stored separately from developer-visible projects',()=>{
 const projectTable=sql.split('create table public.projects (')[1]?.split(');')[0]||'';
 assert.doesNotMatch(projectTable,/contract_amount/i);
 assert.match(sql,/create table public.project_financials/);
 assert.match(sql,/create policy project_financials_admin/);
});
test('Simple credentials remain protected by admin-only RLS and narrow column grants',()=>{
 assert.match(sql,/alter table public.credential_records enable row level security/i);
 assert.match(simple,/create policy credential_records_admin_only[^;]*private\.is_admin\(\)/is);
 assert.match(simple,/grant select \(id, project_id, label, service, username, secret_text, created_at, updated_at\)/i);
 assert.doesNotMatch(simple,/grant (?:all|select \*) on table public.credential_records to authenticated/i);
 assert.match(api,/from\('credential_records'\)/);
 assert.doesNotMatch(api,/functions\.invoke\('vault'/);
 assert.match(simple,/credential\.\' \|\| lower\(TG_OP\)/i);
});
test('Developer task changes are delegated to validated narrow RPC',()=>{
 assert.match(sql,/function public.update_my_task_status/);
 assert.match(sql,/Task is not assigned to you/);
 assert.match(sql,/create policy tasks_write[^;]*private\.is_admin\(\)/s);
});
