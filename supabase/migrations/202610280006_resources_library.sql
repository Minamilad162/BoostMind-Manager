-- BoostMind OS v1.2.3 — company Resources library.
-- Run AFTER migrations 001–005 (or on the currently deployed v1.2.2 database).
-- Shared, non-project library. No changes to projects, invoices, finances or saved logins.
begin;

create table public.resource_folders (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 120),
  description text not null default '' check (length(description) <= 2000),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index resource_folders_unique_title on public.resource_folders (lower(btrim(title)));

create table public.resource_files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.resource_folders(id) on delete restrict,
  file_name text not null check (
    length(file_name) between 1 and 255
    and position('/' in file_name)=0 and position(chr(92) in file_name)=0
    and lower(file_name) ~ '\.(pdf|md|txt|doc|docx|xls|xlsx|ppt|pptx|csv|json|sql|png|jpg|jpeg|webp|zip)$'
  ),
  storage_path text not null unique check (length(storage_path) between 40 and 320),
  mime_type text not null default 'application/octet-stream' check (length(mime_type) between 1 and 150),
  size_bytes bigint not null check (size_bytes between 1 and 20971520),
  uploaded_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint resource_storage_path_matches_folder check (split_part(storage_path,'/',1)=folder_id::text)
);
create index resource_files_folder_idx on public.resource_files(folder_id,created_at desc);

-- Use active BoostMind member identity, not mere possession of an Auth JWT.
create or replace function private.can_read_resources() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id=(select auth.uid()) and active and role in ('admin','developer')
  );
$$;
revoke all on function private.can_read_resources() from public;
grant execute on function private.can_read_resources() to authenticated;

create trigger resource_folder_touch before update on public.resource_folders
for each row execute function private.touch_updated();

alter table public.resource_folders enable row level security;
alter table public.resource_files enable row level security;

-- Storage bucket is PRIVATE: file URLs are never public.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('boostmind-resources','boostmind-resources',false,20971520,null)
on conflict (id) do nothing;

-- Explicit grants (Supabase PostgREST): no anon grant, no file metadata UPDATE.
revoke all on public.resource_folders, public.resource_files from public,anon,authenticated;
grant all on public.resource_folders,public.resource_files to service_role;
grant select,insert,update,delete on public.resource_folders to authenticated;
grant select,insert,delete on public.resource_files to authenticated;

create policy resource_folders_read on public.resource_folders for select to authenticated
using (private.can_read_resources());
create policy resource_folders_admin_insert on public.resource_folders for insert to authenticated
with check (private.is_admin() and created_by=(select auth.uid()));
create policy resource_folders_admin_update on public.resource_folders for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy resource_folders_admin_delete on public.resource_folders for delete to authenticated
using (private.is_admin());

create policy resource_files_read on public.resource_files for select to authenticated
using (private.can_read_resources());
create policy resource_files_admin_insert on public.resource_files for insert to authenticated
with check (private.is_admin() and uploaded_by=(select auth.uid()));
create policy resource_files_admin_delete on public.resource_files for delete to authenticated
using (private.is_admin());

-- RLS at Storage is the second security boundary. Paths: <folder-uuid>/<file-uuid>.<ext>
create policy boostmind_resources_storage_read on storage.objects for select to authenticated
using (bucket_id='boostmind-resources' and private.can_read_resources());
create policy boostmind_resources_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id='boostmind-resources' and private.is_admin()
  and lower(name) ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(pdf|md|txt|doc|docx|xls|xlsx|ppt|pptx|csv|json|sql|png|jpg|jpeg|webp|zip)$'
);
create policy boostmind_resources_storage_delete on storage.objects for delete to authenticated
using (bucket_id='boostmind-resources' and private.is_admin());

commit;
