-- Read-only v1.2.3 resources migration verification. Run in Supabase SQL Editor.
-- Does not upload files or change permissions.
with checks(check_name,passed) as (
 select 'Folders table exists', to_regclass('public.resource_folders') is not null
 union all select 'Files table exists', to_regclass('public.resource_files') is not null
 union all select 'Resource folders RLS on', exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='resource_folders' and c.relrowsecurity)
 union all select 'Resource files RLS on', exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='resource_files' and c.relrowsecurity)
 union all select 'Private storage bucket exists', exists(select 1 from storage.buckets where id='boostmind-resources' and public=false)
 union all select 'Bucket file limit is 20MB', exists(select 1 from storage.buckets where id='boostmind-resources' and file_size_limit=20971520)
 union all select 'Resource folder read policy', exists(select 1 from pg_policies where schemaname='public' and tablename='resource_folders' and policyname='resource_folders_read')
 union all select 'Resource folder admin create policy', exists(select 1 from pg_policies where schemaname='public' and tablename='resource_folders' and policyname='resource_folders_admin_insert')
 union all select 'Resource files read policy', exists(select 1 from pg_policies where schemaname='public' and tablename='resource_files' and policyname='resource_files_read')
 union all select 'Resource files admin create policy', exists(select 1 from pg_policies where schemaname='public' and tablename='resource_files' and policyname='resource_files_admin_insert')
 union all select 'Storage bucket read RLS policy', exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='boostmind_resources_storage_read')
 union all select 'Storage bucket write RLS policy', exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='boostmind_resources_storage_insert')
 union all select 'Storage bucket delete RLS policy', exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='boostmind_resources_storage_delete')
 union all select 'Anon cannot select folders', not has_table_privilege('anon','public.resource_folders','SELECT')
 union all select 'Anon cannot select file metadata', not has_table_privilege('anon','public.resource_files','SELECT')
)
select check_name,passed,case when passed then 'PASS' else 'FAIL' end as verdict from checks order by check_name;
