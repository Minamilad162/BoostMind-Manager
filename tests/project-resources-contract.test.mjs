import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync(new URL('../supabase/migrations/202610280004_project_scoped_resources.sql',import.meta.url),'utf8');
const initial=readFileSync(new URL('../supabase/migrations/202610280001_initial.sql',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const api=readFileSync(new URL('../src/lib/api.ts',import.meta.url),'utf8');
const types=readFileSync(new URL('../src/lib/types.ts',import.meta.url),'utf8');

test('Existing and new links/logins belong to a real project',()=>{
 assert.match(initial,/create table public.project_links\s*\([\s\S]*?project_id uuid not null unique references public.projects\(id\)/i);
 assert.match(initial,/create table public.credential_records\s*\([\s\S]*?project_id uuid not null references public.projects\(id\)/i);
 assert.match(api,/\.eq\('project_id',projectId\)/);
 assert.match(api,/project_id:input\.project_id/);
 assert.match(app,/tab==='access'&&admin&&<VaultPage/);
 assert.match(app,/initialProject=\{p\.id\} embedded/);
 assert.match(app,/name="resource_project" required value=\{formProjectId\}/);
 assert.match(app,/!targetProjectId\|\|!w\.projects\.some/);
});

test('Other category and custom titled link/login records are offered',()=>{
 assert.match(app,/\['Database','Hosting','Website','Domain','GitHub','Project Admin','Project User','Email','Other'\]/);
 assert.match(app,/serviceChoice==='Other'/);
 assert.match(app,/name="custom_service" required/);
 assert.match(app,/name="label" required/);
 assert.match(app,/name="access_url" type="url"/);
 assert.match(api,/!secret&&!accessUrl/);
 assert.match(api,/new URL\(accessUrl\)/);
 assert.match(types,/access_url:string\|null/);
});

test('Resource URL migration is additive, retains records and admin-only database access',()=>{
 assert.match(migration,/ADD COLUMN IF NOT EXISTS access_url text/);
 assert.match(migration,/credential_resource_has_content/);
 assert.match(migration,/credential_access_url_valid/);
 assert.match(migration,/ALTER TABLE public\.credential_records ENABLE ROW LEVEL SECURITY/);
 assert.match(migration,/CREATE POLICY credential_records_admin_only[\s\S]*?private\.is_admin\(\)/);
 assert.match(migration,/GRANT SELECT \(id, project_id, label, service, username, secret_text, access_url, created_at, updated_at\)/);
 assert.match(migration,/GRANT INSERT \(project_id, label, service, username, secret_text, access_url\)/);
 assert.doesNotMatch(migration,/DELETE\s+FROM\s+public\.credential_records|TRUNCATE\s+TABLE\s+public\.credential_records/i);
 assert.doesNotMatch(api,/functions\.invoke\('vault'/);
});
