-- BOOSTMIND OS: greenfield schema. Intentionally no migrations or data imports from older BoostMind projects.
begin;
create extension if not exists pgcrypto;
create schema if not exists private;
grant usage on schema private to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default 'Team member' check (length(trim(name)) between 1 and 120),
 email text not null,
 role text not null default 'developer' check (role in ('admin','developer')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name,email,role)
 values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),split_part(coalesce(new.email,'member'), '@',1)),coalesce(new.email,''),'developer')
 on conflict (id) do nothing;
 return new;
end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and active and role='admin');
$$;

create table public.clients (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 180),
 company text, email text, phone text, whatsapp_url text, notes text,
 created_at timestamptz not null default now()
);
create table public.projects (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 180),
 description text,
 client_id uuid references public.clients(id) on delete set null,
 owner_id uuid references public.profiles(id) on delete set null,
 status text not null default 'planning' check(status in ('planning','active','review','completed','on_hold')),
 contract_date date not null default current_date,
 due_date date,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
-- Financial contract values are kept in a separate admin-only table.
-- A developer can SELECT projects directly without ever receiving contract amounts.
create table public.project_financials (
 project_id uuid primary key references public.projects(id) on delete cascade,
 contract_amount numeric(14,2) not null default 0 check(contract_amount >= 0),
 currency text not null default 'EGP' check(currency in ('EGP','USD','SAR','EUR')),
 created_at timestamptz not null default now()
);
create index projects_due_idx on public.projects(due_date);
create index projects_client_idx on public.projects(client_id);

create table public.project_memberships (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(project_id,user_id)
);
create index membership_user_idx on public.project_memberships(user_id,project_id);
create or replace function private.can_access_project(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_admin() or exists (
 select 1 from public.project_memberships m join public.profiles p on p.id=m.user_id
 where m.project_id=p_id and m.user_id=(select auth.uid()) and p.active
 ) or exists (select 1 from public.projects p where p.id=p_id and p.owner_id=(select auth.uid()));
$$;

create table public.features (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 200), description text,
 created_at timestamptz not null default now()
);
create index features_project_idx on public.features(project_id);
create table public.tasks (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 feature_id uuid references public.features(id) on delete set null,
 title text not null check(length(trim(title)) between 1 and 200),description text,
 assignee_id uuid references public.profiles(id) on delete set null,
 status text not null default 'todo' check(status in ('todo','in_progress','review','done')),
 priority text not null default 'medium' check(priority in ('low','medium','high')),
 due_date date,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index tasks_project_status_idx on public.tasks(project_id,status);
create index tasks_assignee_idx on public.tasks(assignee_id,status);
-- Task-only assignment grants visibility to the assigned project's work.
create or replace function private.can_access_project(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_admin() or exists (
 select 1 from public.project_memberships m join public.profiles pr on pr.id=m.user_id
 where m.project_id=p_id and m.user_id=(select auth.uid()) and pr.active
 ) or exists (select 1 from public.projects p where p.id=p_id and p.owner_id=(select auth.uid()))
 or exists (select 1 from public.tasks t join public.profiles pr on pr.id=t.assignee_id
  where t.project_id=p_id and t.assignee_id=(select auth.uid()) and pr.active);
$$;

create or replace function private.check_task_feature() returns trigger language plpgsql set search_path='' as $$
begin
 if new.feature_id is not null and not exists(select 1 from public.features where id=new.feature_id and project_id=new.project_id) then
  raise exception 'Feature must belong to the same project';
 end if;
 return new;
end;$$;
create trigger tasks_feature_guard before insert or update of project_id,feature_id on public.tasks for each row execute function private.check_task_feature();

create table public.payments (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,
 amount numeric(14,2) not null check(amount>0),paid_at date not null default current_date,
 method text,reference text,notes text,created_at timestamptz not null default now()
);
create index payments_project_date_idx on public.payments(project_id,paid_at);
create table public.expenses (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 200),category text not null default 'Other',
 amount numeric(14,2) not null check(amount>0),
 status text not null default 'planned' check(status in ('planned','paid')),
 paid_at date,paid_by text not null default 'company' check(paid_by in ('company','mina','bishoy')),
 notes text,created_at timestamptz not null default now(),
 constraint paid_date_consistent check ((status='paid' and paid_at is not null) or (status='planned' and paid_at is null))
);
create index expenses_project_date_idx on public.expenses(project_id,paid_at);
create table public.distributions (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,
 partner_code text not null check(partner_code in ('mina','bishoy')),
 kind text not null check(kind in ('profit','reimbursement')),
 amount numeric(14,2) not null check(amount>0),paid_at date not null default current_date,
 notes text,created_at timestamptz not null default now()
);
create index distributions_project_date_idx on public.distributions(project_id,paid_at);
-- The payout ledger is append-only. Prevent double allocations even under concurrent requests.
create or replace function private.check_distribution() returns trigger language plpgsql security definer set search_path='' as $$
declare v_collected numeric;v_cost numeric;v_existing numeric;v_credit numeric;
begin
 perform 1 from public.projects where id=new.project_id for update;
 select coalesce(sum(amount),0) into v_collected from public.payments where project_id=new.project_id;
 select coalesce(sum(amount),0) into v_cost from public.expenses where project_id=new.project_id and status='paid';
 select coalesce(sum(amount),0) into v_existing from public.distributions where project_id=new.project_id and partner_code=new.partner_code and kind=new.kind;
 if new.kind='profit' then v_credit:=greatest(0,(v_collected-v_cost)/2);
 else select coalesce(sum(amount),0) into v_credit from public.expenses where project_id=new.project_id and status='paid' and paid_by=new.partner_code;
 end if;
 if v_existing+new.amount>v_credit then raise exception 'Payment exceeds available partner balance';end if;
 return new;
end;$$;
create trigger distribution_limit before insert on public.distributions for each row execute function private.check_distribution();

create table public.project_links (
 id uuid primary key default gen_random_uuid(),project_id uuid not null unique references public.projects(id) on delete cascade,
 website_url text check (website_url is null or website_url ~* '^https?://'),
 database_url text check (database_url is null or database_url ~* '^https?://'),
 hosting_url text check (hosting_url is null or hosting_url ~* '^https?://'),
 hosting_provider text,
 github_url text check (github_url is null or github_url ~* '^https?://'),
 updated_at timestamptz not null default now()
);
-- Never expose ciphertext through PostgREST to logged-in browsers.
create table public.credential_records (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,
 label text not null,service text not null,username text not null default '',
 ciphertext text not null,iv text not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index credentials_project_idx on public.credential_records(project_id);
create table public.audit_events (
 id bigint generated always as identity primary key,
 actor_id uuid references public.profiles(id) on delete set null,
 action text not null,entity_type text not null,entity_id uuid,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index audit_created_idx on public.audit_events(created_at desc);
create or replace function private.touch_updated() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now();return new;end;$$;
create trigger touch_projects before update on public.projects for each row execute function private.touch_updated();
create trigger touch_tasks before update on public.tasks for each row execute function private.touch_updated();
create trigger touch_project_links before update on public.project_links for each row execute function private.touch_updated();
create trigger touch_credential_records before update on public.credential_records for each row execute function private.touch_updated();

-- Financial event audit. Store action and record id only; never log passwords or raw tokens.
create or replace function private.audit_financial_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_events(actor_id,action,entity_type,entity_id,details)
 values((select auth.uid()),lower(tg_table_name)||'.'||lower(tg_op),tg_table_name,coalesce(new.id,old.id),
 jsonb_build_object('project_id',coalesce(new.project_id,old.project_id)));
 return coalesce(new,old);
end;$$;
create trigger audit_payments after insert or update or delete on public.payments for each row execute function private.audit_financial_change();
create trigger audit_expenses after insert or update or delete on public.expenses for each row execute function private.audit_financial_change();
create trigger audit_distributions after insert or update or delete on public.distributions for each row execute function private.audit_financial_change();


-- Explicit grants and deny-by-default RLS. No public (anon) table grants.
revoke all on public.profiles,public.clients,public.projects,public.project_financials,
 public.project_memberships,public.features,public.tasks,public.payments,public.expenses,
 public.distributions,public.project_links,public.credential_records,public.audit_events from anon,authenticated;
-- Edge Functions have service-role access to the protected credential table.
grant all on public.profiles,public.clients,public.projects,public.project_financials,
 public.project_memberships,public.features,public.tasks,public.payments,public.expenses,
 public.distributions,public.project_links,public.credential_records,public.audit_events to service_role;
grant usage,select on sequence public.audit_events_id_seq to service_role;
grant select on public.profiles,public.projects,public.project_memberships,public.features,public.tasks to authenticated;
grant update(name) on public.profiles to authenticated;
grant select,insert,update,delete on public.clients,public.features,public.projects,public.tasks,public.project_memberships,public.project_links,public.expenses to authenticated;
grant select,insert on public.payments,public.distributions to authenticated;
grant select on public.audit_events to authenticated;
-- These grants never include credential_records: only server-side service-role is allowed to handle ciphertext.
grant select,insert,update,delete on public.project_links to authenticated;
grant select,insert,update on public.project_financials to authenticated;

alter table public.project_financials enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_memberships enable row level security;
alter table public.features enable row level security;
alter table public.tasks enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.distributions enable row level security;
alter table public.project_links enable row level security;
alter table public.credential_records enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (active and (private.is_admin() or id=(select auth.uid()) or exists(select 1 from public.project_memberships m where m.user_id=profiles.id and private.can_access_project(m.project_id))));
create policy profiles_self_name on public.profiles for update to authenticated using (id=(select auth.uid()) and active) with check (id=(select auth.uid()) and active);

create policy project_financials_admin on public.project_financials for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy clients_admin on public.clients for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy projects_read on public.projects for select to authenticated using(private.can_access_project(id));
create policy projects_admin_insert on public.projects for insert to authenticated with check(private.is_admin());
create policy projects_admin_update on public.projects for update to authenticated using(private.is_admin()) with check(private.is_admin());
create policy projects_admin_delete on public.projects for delete to authenticated using(private.is_admin());
create policy members_read on public.project_memberships for select to authenticated using(private.is_admin() or user_id=(select auth.uid()));
create policy members_admin on public.project_memberships for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy features_read on public.features for select to authenticated using(private.can_access_project(project_id));
create policy features_write on public.features for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy tasks_read on public.tasks for select to authenticated using(private.can_access_project(project_id));
create policy tasks_write on public.tasks for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy payments_read on public.payments for select to authenticated using(private.is_admin());
create policy payments_create on public.payments for insert to authenticated with check(private.is_admin());
create policy expenses_admin on public.expenses for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy distributions_read on public.distributions for select to authenticated using(private.is_admin());
create policy distributions_create on public.distributions for insert to authenticated with check(private.is_admin());
create policy project_links_admin on public.project_links for all to authenticated using(private.is_admin()) with check(private.is_admin());
-- No authenticated policy on credentials: even metadata only through validated Edge Function.
create policy audit_admin on public.audit_events for select to authenticated using(private.is_admin());

create or replace function public.save_project(
 p_id uuid,p_name text,p_description text,p_client_id uuid,p_owner_id uuid,p_status text,
 p_contract_amount numeric,p_currency text,p_contract_date date,p_due_date date
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if not private.is_admin() then raise exception 'Only admins can save projects';end if;
 if p_name is null or length(trim(p_name))<1 or p_contract_amount<0
 or p_currency not in ('EGP','USD','SAR','EUR')
 or p_status not in ('planning','active','review','completed','on_hold')
 or p_contract_date is null then raise exception 'Invalid project input';end if;
 if p_id is null then
  insert into public.projects(name,description,client_id,owner_id,status,contract_date,due_date)
  values(p_name,p_description,p_client_id,p_owner_id,p_status,p_contract_date,p_due_date) returning id into v_id;
 else
  update public.projects set name=p_name,description=p_description,client_id=p_client_id,owner_id=p_owner_id,
   status=p_status,contract_date=p_contract_date,due_date=p_due_date where id=p_id returning id into v_id;
  if v_id is null then raise exception 'Project not found';end if;
 end if;
 insert into public.project_financials(project_id,contract_amount,currency) values(v_id,p_contract_amount,p_currency)
 on conflict(project_id) do update set contract_amount=excluded.contract_amount,currency=excluded.currency;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,details)
 values((select auth.uid()),'project.saved','project',v_id,jsonb_build_object('new',p_id is null));
 return v_id;
end;$$;
revoke all on function public.save_project(uuid,text,text,uuid,uuid,text,numeric,text,date,date) from public;
grant execute on function public.save_project(uuid,text,text,uuid,uuid,text,numeric,text,date,date) to authenticated;

create or replace function public.update_my_task_status(p_task_id uuid,p_status text) returns void
 language plpgsql security definer set search_path='' as $$
declare v_task public.tasks%rowtype;
begin
 if p_status not in ('todo','in_progress','review','done') then raise exception 'Invalid task status';end if;
 select * into v_task from public.tasks where id=p_task_id for update;
 if not found then raise exception 'Task not found';end if;
 if not private.is_admin() and not exists(
   select 1 from public.profiles p where p.id=(select auth.uid()) and p.active and (
    v_task.assignee_id=p.id
    or exists(select 1 from public.projects pr where pr.id=v_task.project_id and pr.owner_id=p.id)
    or exists(select 1 from public.project_memberships pm where pm.project_id=v_task.project_id and pm.user_id=p.id)
   )
 ) then raise exception 'Task is not assigned to you';end if;
 update public.tasks set status=p_status where id=p_task_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,details)
 values((select auth.uid()),'task.status_changed','task',p_task_id,jsonb_build_object('old',v_task.status,'new',p_status));
end;$$;
revoke all on function public.update_my_task_status(uuid,text) from public;
grant execute on function public.update_my_task_status(uuid,text) to authenticated;

create or replace function public.set_project_member(p_project_id uuid,p_user_id uuid,p_assigned boolean) returns void
 language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'Only admins can assign project members';end if;
 if not exists(select 1 from public.profiles where id=p_user_id and active) then raise exception 'User unavailable';end if;
 if p_assigned then insert into public.project_memberships(project_id,user_id) values(p_project_id,p_user_id) on conflict do nothing;
 else delete from public.project_memberships where project_id=p_project_id and user_id=p_user_id;end if;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,details)
 values((select auth.uid()),'project.assignment','project',p_project_id,jsonb_build_object('user_id',p_user_id,'assigned',p_assigned));
end;$$;
revoke all on function public.set_project_member(uuid,uuid,boolean) from public;
grant execute on function public.set_project_member(uuid,uuid,boolean) to authenticated;
-- private helpers are only intended inside policies/functions
revoke all on function private.is_admin() from public;
revoke all on function private.can_access_project(uuid) from public;
grant execute on function private.is_admin(),private.can_access_project(uuid) to authenticated;
commit;


-- === V1.1 DUAL CURRENCY ===

-- BoostMind OS v1.1: USD + EGP snapshots and calendar period reports.
-- For the standalone NEW BoostMind database. Do not run on any older BoostMind or customer DB.
-- New transactions MUST have both equivalents; older v1 records with unknown FX stay NULL,
-- are flagged in the UI and are NOT silently assigned an invented conversion rate.
begin;

alter table public.project_financials
 add column amount_usd numeric(18,2),
 add column amount_egp numeric(18,2),
 add constraint contract_dual_positive check(amount_usd is null or amount_usd >= 0) ,
 add constraint contract_egp_positive check(amount_egp is null or amount_egp >= 0),
 add constraint contract_native_match check(
  (currency <> 'EGP' or amount_egp is null or amount_egp = contract_amount)
  and (currency <> 'USD' or amount_usd is null or amount_usd = contract_amount)
 );

alter table public.payments add column amount_usd numeric(18,2),add column amount_egp numeric(18,2);
alter table public.expenses add column amount_usd numeric(18,2),add column amount_egp numeric(18,2);
alter table public.distributions add column amount_usd numeric(18,2),add column amount_egp numeric(18,2);

-- Require signed, explicit snapshots on all new money records. Preserve existing records
-- without falsely guessing their historical FX; they require explicit back-office reconciliation.
create or replace function private.require_dual_amount() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_native text;
begin
 if new.amount_usd is null or new.amount_egp is null
    or new.amount_usd::text = 'NaN' or new.amount_egp::text = 'NaN'
    or new.amount_usd<=0 or new.amount_egp<=0 then
  raise exception 'Enter valid positive USD and EGP equivalents. No automatic exchange rate is assumed.';
 end if;
 select currency into v_native from public.project_financials where project_id=new.project_id;
 if v_native is null then raise exception 'Project finance currency must be configured first'; end if;
 if (v_native='USD' and new.amount_usd<>new.amount)
  or (v_native='EGP' and new.amount_egp<>new.amount) then
  raise exception 'The equivalent in the project currency must match the original amount';
 end if;
 return new;
end;$$;

create trigger payments_dual_amount before insert or update of amount,amount_usd,amount_egp,project_id on public.payments
 for each row execute function private.require_dual_amount();
create trigger expenses_dual_amount before insert or update of amount,amount_usd,amount_egp,project_id on public.expenses
 for each row execute function private.require_dual_amount();
create trigger distributions_dual_amount before insert or update of amount,amount_usd,amount_egp,project_id on public.distributions
 for each row execute function private.require_dual_amount();

create or replace function private.require_dual_contract() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and old.currency is distinct from new.currency
   and (exists(select 1 from public.payments where project_id=new.project_id)
    or exists(select 1 from public.expenses where project_id=new.project_id)
    or exists(select 1 from public.distributions where project_id=new.project_id)) then
   raise exception 'Currency is locked after financial activity';
 end if;
 if new.amount_usd is null or new.amount_egp is null
   or new.amount_usd::text = 'NaN' or new.amount_egp::text = 'NaN'
   or new.amount_usd < 0 or new.amount_egp < 0 then
  raise exception 'Contract must have both USD and EGP equivalents';
 end if;
 if new.contract_amount = 0 then
  if new.amount_usd<>0 or new.amount_egp<>0 then raise exception 'Zero-valued contract must have zero equivalents';end if;
 elsif new.amount_usd<=0 or new.amount_egp<=0 then
  raise exception 'Both equivalents must be positive';
 end if;
 if (new.currency='USD' and new.contract_amount<>new.amount_usd)
    or (new.currency='EGP' and new.contract_amount<>new.amount_egp) then
  raise exception 'Original amount must match its USD or EGP equivalent';
 end if;
 return new;
end;$$;
create trigger project_contract_dual before insert or update of contract_amount,currency,amount_usd,amount_egp on public.project_financials
 for each row execute function private.require_dual_contract();

-- Remove previous RPC signature to prevent an unconverted write path.
drop function if exists public.save_project(uuid,text,text,uuid,uuid,text,numeric,text,date,date);
create function public.save_project(
 p_id uuid,p_name text,p_description text,p_client_id uuid,p_owner_id uuid,p_status text,
 p_contract_amount numeric,p_amount_usd numeric,p_amount_egp numeric,p_currency text,
 p_contract_date date,p_due_date date
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if not private.is_admin() then raise exception 'Only admins can save projects';end if;
 if p_name is null or length(trim(p_name))<1 or p_contract_amount is null or p_contract_amount<0
 or p_currency not in ('EGP','USD','SAR','EUR')
 or p_status not in ('planning','active','review','completed','on_hold')
 or p_contract_date is null then raise exception 'Invalid project input';end if;
 if p_id is null then
  insert into public.projects(name,description,client_id,owner_id,status,contract_date,due_date)
  values(p_name,p_description,p_client_id,p_owner_id,p_status,p_contract_date,p_due_date) returning id into v_id;
 else
  if exists (select 1 from public.project_financials f where f.project_id=p_id and f.currency<>p_currency)
   and (exists(select 1 from public.payments where project_id=p_id)
    or exists(select 1 from public.expenses where project_id=p_id)
    or exists(select 1 from public.distributions where project_id=p_id)) then
   raise exception 'Cannot change project currency after money transactions exist. Set up a separate project instead';
  end if;
  update public.projects set name=p_name,description=p_description,client_id=p_client_id,owner_id=p_owner_id,
   status=p_status,contract_date=p_contract_date,due_date=p_due_date where id=p_id returning id into v_id;
  if v_id is null then raise exception 'Project not found';end if;
 end if;
 insert into public.project_financials(project_id,contract_amount,amount_usd,amount_egp,currency)
 values(v_id,p_contract_amount,p_amount_usd,p_amount_egp,p_currency)
 on conflict(project_id) do update set contract_amount=excluded.contract_amount,
 amount_usd=excluded.amount_usd,amount_egp=excluded.amount_egp,currency=excluded.currency;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,details)
 values((select auth.uid()),'project.saved','project',v_id,
 jsonb_build_object('new',p_id is null,'currency',p_currency,'native',p_contract_amount,
 'usd_equivalent',p_amount_usd,'egp_equivalent',p_amount_egp));
 return v_id;
end;$$;
revoke all on function public.save_project(uuid,text,text,uuid,uuid,text,numeric,numeric,numeric,text,date,date) from public;
grant execute on function public.save_project(uuid,text,text,uuid,uuid,text,numeric,numeric,numeric,text,date,date) to authenticated;

-- No extra anon privileges; RLS and existing server-side roles remain unchanged.
comment on column public.project_financials.amount_egp is 'User-confirmed EGP equivalent at contract valuation; never refreshed from live FX';
comment on column public.project_financials.amount_usd is 'User-confirmed USD equivalent at contract valuation; never refreshed from live FX';
comment on column public.payments.amount_egp is 'EGP at receipt date; immutable valuation snapshot';
comment on column public.expenses.amount_egp is 'EGP at expenditure date; immutable valuation snapshot';
comment on column public.distributions.amount_egp is 'EGP payout-date valuation snapshot';
commit;
