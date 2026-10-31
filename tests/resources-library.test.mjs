import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RESOURCE_MAX_BYTES,RESOURCE_EXTENSIONS,validateResourceFile,fileExtension} from '../src/resources/validation.ts';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');

test('Resource file validation accepts PDF and Markdown, rejects invalid and oversized files',()=>{
  assert.equal(fileExtension('ProjectGuide.MD'),'md');
  validateResourceFile(new File(['# Guide'],'Guide.md',{type:'text/markdown'}));
  validateResourceFile(new File(['%PDF'],'report.pdf',{type:'application/pdf'}));
  validateResourceFile(new File(['1'],'slide.pptx'));
  assert.ok(RESOURCE_EXTENSIONS.includes('zip'));
  assert.equal(RESOURCE_MAX_BYTES,20*1024*1024);
  assert.throws(()=>validateResourceFile(new File(['<script>'],'unsafe.html')),/Unsupported file/);
  assert.throws(()=>validateResourceFile(new File(['x'],'../escape.pdf')),/Unsupported file/);
  assert.throws(()=>validateResourceFile(new File(['x'],'file.exe')),/Unsupported file/);
  assert.throws(()=>validateResourceFile(new File([],'empty.md')),/between 1 byte and 20 MB/);
  assert.throws(()=>validateResourceFile(new File(['a'.repeat(20*1024*1024+1)],'big.pdf')),/between 1 byte and 20 MB/);
});

test('Resources has a dedicated visible menu and works without linking a Project',()=>{
  const app=read('../src/App.tsx');
  const page=read('../src/resources/ResourcesPage.tsx');
  assert.match(app, /id:'resources',label:'Resources'/);
  assert.match(app, /view==='resources'&&<ResourcesPage admin={admin}/);
  assert.match(page, /Create resource folder/);
  assert.match(page, /Folder name/);
  assert.match(page, /Description/);
  assert.match(page, /Upload files/);
  assert.match(page, /Download/);
  assert.match(page, /Search Resources/);
  assert.match(page, /admin&&/);
  assert.doesNotMatch(read('../src/resources/api.ts'),/functions\.invoke\(/);
});

test('Resources SQL has private storage, active-user RLS, admin-only mutations, grants and safe deletes',()=>{
  const sql=read('../supabase/migrations/202610280006_resources_library.sql');
  assert.match(sql,/create table public\.resource_folders/);
  assert.match(sql,/create table public\.resource_files/);
  assert.match(sql,/foreign key|references public\.resource_folders\(id\) on delete restrict/i);
  assert.match(sql,/alter table public\.resource_folders enable row level security/);
  assert.match(sql,/alter table public\.resource_files enable row level security/);
  assert.match(sql,/private\.can_read_resources/);
  assert.match(sql,/and active and role in \('admin','developer'\)/);
  assert.match(sql,/private\.is_admin\(\)/);
  assert.match(sql,/grant select,insert,delete on public\.resource_files to authenticated/);
  assert.match(sql,/boostmind-resources','boostmind-resources',false,20971520,null/);
  assert.match(sql,/create policy boostmind_resources_storage_read/);
  assert.match(sql,/create policy boostmind_resources_storage_insert/);
  assert.match(sql,/create policy boostmind_resources_storage_delete/);
  assert.doesNotMatch(sql,/grant .* on public\.resource_files to anon/i);
  assert.doesNotMatch(sql,/create policy .*_public/);
});

test('Upload is two-step and attempts cleanup after metadata failure; download links expire',()=>{
  const api=read('../src/resources/api.ts');
  assert.match(api,/\.storage\.from\(RESOURCE_BUCKET\)\.upload\(/);
  assert.match(api,/client\.from\('resource_files'\)\.insert\(/);
  assert.match(api,/if\(metadataError\)/);
  assert.match(api,/\.remove\(\[path\]\)/);
  assert.match(api,/createSignedUrl\(record\.storage_path, 60/);
  assert.doesNotMatch(api,/getPublicUrl/);
});
