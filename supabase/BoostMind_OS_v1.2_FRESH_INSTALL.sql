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


-- BoostMind OS v1.1.2: simple admin-only credential strings (NO Vault Edge Function).
-- Apply only AFTER 202610280001_initial.sql and 202610280002_dual_currency_reporting.sql.
-- No existing credential rows are deleted. Existing encrypted entries remain stored but
-- cannot be shown as text by this simplified UI; re-enter those credentials if needed.
-- WARNING: secret_text is readable PLAINTEXT to authorized admins via PostgREST.
BEGIN;
ALTER TABLE public.credential_records
 ADD COLUMN IF NOT EXISTS secret_text text;
ALTER TABLE public.credential_records
 ALTER COLUMN ciphertext DROP NOT NULL,
 ALTER COLUMN iv DROP NOT NULL;

-- Validate newly entered passwords; do not log or copy password text to audit records.
ALTER TABLE public.credential_records
 ADD CONSTRAINT credential_secret_text_length
 CHECK (secret_text IS NULL OR char_length(secret_text) BETWEEN 1 AND 4000);
ALTER TABLE public.credential_records
 ADD CONSTRAINT credential_secret_text_required
 CHECK (secret_text IS NOT NULL OR (ciphertext IS NOT NULL AND iv IS NOT NULL));

-- RLS only permits active admin profiles, including direct REST/API calls.
ALTER TABLE public.credential_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credential_records_admin_only ON public.credential_records;
CREATE POLICY credential_records_admin_only ON public.credential_records
 FOR ALL TO authenticated
 USING (private.is_admin()) WITH CHECK (private.is_admin());

-- Force narrow column permissions. Browsers never receive old ciphertext/IV columns.
REVOKE ALL ON TABLE public.credential_records FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, project_id, label, service, username, secret_text, created_at, updated_at)
 ON TABLE public.credential_records TO authenticated;
GRANT INSERT (project_id, label, service, username, secret_text)
 ON TABLE public.credential_records TO authenticated;
GRANT UPDATE (label, service, username, secret_text)
 ON TABLE public.credential_records TO authenticated;
GRANT DELETE ON TABLE public.credential_records TO authenticated;

-- Audit creates, edits and deletes without ever persisting credentials in the audit log.
CREATE OR REPLACE FUNCTION private.audit_credential_change() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_project uuid;
BEGIN
 IF TG_OP='DELETE' THEN v_id:=OLD.id; v_project:=OLD.project_id;
 ELSE v_id:=NEW.id; v_project:=NEW.project_id; END IF;
 INSERT INTO public.audit_events(actor_id,action,entity_type,entity_id,details)
 VALUES ((SELECT auth.uid()), 'credential.' || lower(TG_OP), 'credential', v_id,
         jsonb_build_object('project_id', v_project));
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS credential_change_audit ON public.credential_records;
CREATE TRIGGER credential_change_audit
 AFTER INSERT OR UPDATE OR DELETE ON public.credential_records
 FOR EACH ROW EXECUTE FUNCTION private.audit_credential_change();

COMMENT ON COLUMN public.credential_records.secret_text IS
 'PLAIN TEXT: explicitly requested simple storage. Admin RLS only; not application-encrypted.';
COMMIT;


-- ==== Migration 004: project-scoped custom links and logins ====
-- BoostMind OS v1.1.3: all custom links/logins belong to a project.
-- Apply AFTER migration 003, only once. Additive; keeps all existing records.
-- Existing credential_records.project_id already has FK -> projects(id) ON DELETE CASCADE.
BEGIN;

-- A custom resource may have a web link with or without a password.
ALTER TABLE public.credential_records ADD COLUMN IF NOT EXISTS access_url text;
ALTER TABLE public.credential_records DROP CONSTRAINT IF EXISTS credential_secret_text_required;
ALTER TABLE public.credential_records DROP CONSTRAINT IF EXISTS credential_resource_has_content;
ALTER TABLE public.credential_records ADD CONSTRAINT credential_resource_has_content
 CHECK ((secret_text IS NOT NULL AND length(secret_text) > 0)
  OR (access_url IS NOT NULL AND length(btrim(access_url)) > 0)
  OR (ciphertext IS NOT NULL AND iv IS NOT NULL));
ALTER TABLE public.credential_records DROP CONSTRAINT IF EXISTS credential_access_url_valid;
ALTER TABLE public.credential_records ADD CONSTRAINT credential_access_url_valid
 CHECK (access_url IS NULL OR
  (char_length(access_url) <= 2048 AND access_url ~* '^https?://[^[:space:]]+$'));

-- Direct browser grants remain narrow; active admins are enforced by RLS.
ALTER TABLE public.credential_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credential_records_admin_only ON public.credential_records;
CREATE POLICY credential_records_admin_only ON public.credential_records
 FOR ALL TO authenticated
 USING (private.is_admin()) WITH CHECK (private.is_admin());
REVOKE ALL ON TABLE public.credential_records FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, project_id, label, service, username, secret_text, access_url, created_at, updated_at)
 ON TABLE public.credential_records TO authenticated;
GRANT INSERT (project_id, label, service, username, secret_text, access_url)
 ON TABLE public.credential_records TO authenticated;
GRANT UPDATE (label, service, username, secret_text, access_url)
 ON TABLE public.credential_records TO authenticated;
GRANT DELETE ON TABLE public.credential_records TO authenticated;

CREATE INDEX IF NOT EXISTS credential_resources_project_created_idx
 ON public.credential_records(project_id,created_at DESC);
COMMENT ON COLUMN public.credential_records.access_url IS
 'Optional custom http(s) project link; can coexist with admin-only plaintext login.';
COMMIT;


-- v1.2 Invoice Studio follows the preceding 4 migrations.
-- BoostMind OS v1.2: native invoice studio for GREENFIELD v1.1.3 only.
-- Apply after 202610280004_project_scoped_resources.sql, on staging first.
-- The old v0.11.22 database is NOT migrated or attached.
begin;

alter table public.clients add column if not exists legal_name text;
alter table public.clients add column if not exists address text;
alter table public.clients add column if not exists tax_number text;
alter table public.clients add column if not exists tax_registration_number text;
alter table public.clients add column if not exists commercial_registration_number text;
alter table public.clients add column if not exists primary_contact text;

create table public.invoice_billing_profiles (
 id uuid primary key default gen_random_uuid(),
 singleton boolean not null default true unique check(singleton),
 display_name text not null default 'BoostMind',
 legal_name text not null default '', address text not null default '',
 tax_number text not null default '', tax_registration_number text not null default '',
 commercial_registration_number text not null default '',
 email text not null default '', phone text not null default '',
 bank_name text not null default '', account_name text not null default '',
 account_number text not null default '', iban text not null default '',
 swift_code text not null default '', default_payment_terms text not null default '',
 default_footer text not null default '',updated_at timestamptz not null default now()
);
create table public.invoices (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete restrict,
 client_id uuid not null references public.clients(id) on delete restrict,
 invoice_number text not null unique,
 electronic_invoice_reference text unique,
 issue_date date not null, due_date date,
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 subtotal numeric(18,2) not null default 0 check(subtotal>=0),
 tax_amount numeric(18,2) not null default 0 check(tax_amount>=0),
 total_amount numeric(18,2) generated always as (subtotal+tax_amount) stored,
 status text not null default 'draft' check(status in ('draft','issued','overdue','partial','paid','cancelled')),
 notes text not null default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 created_by uuid references public.profiles(id),
 constraint invoice_number_nonblank check(length(btrim(invoice_number)) between 1 and 120),
 constraint e_invoice_nonblank check(electronic_invoice_reference is null or length(btrim(electronic_invoice_reference))>0)
);
create index invoice_project_idx on public.invoices(project_id,issue_date desc);
create index invoice_client_idx on public.invoices(client_id,issue_date desc);
create table public.invoice_lines (
 id uuid primary key default gen_random_uuid(),invoice_id uuid not null references public.invoices(id) on delete cascade,
 feature_id uuid references public.features(id) on delete set null,
 description text not null check(length(btrim(description))>0),
 quantity numeric(18,4) not null check(quantity>0),
 unit_price numeric(18,4) not null check(unit_price>=0),
 sort_order integer not null default 0
);
create index invoice_lines_invoice_idx on public.invoice_lines(invoice_id,sort_order);
create table public.invoice_presentations (
 invoice_id uuid primary key references public.invoices(id) on delete cascade,
 snapshot jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 constraint snapshot_object check(jsonb_typeof(snapshot)='object')
);

-- Existing payments remain the sole source of received company money.
-- Invoice allocations are optional and must NEVER create another payment/receipt.
alter table public.payments add column if not exists invoice_id uuid references public.invoices(id) on delete restrict;
create index payments_invoice_idx on public.payments(invoice_id) where invoice_id is not null;

alter table public.invoice_billing_profiles enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.invoice_presentations enable row level security;
revoke all on public.invoice_billing_profiles,public.invoices,public.invoice_lines,public.invoice_presentations from PUBLIC,anon,authenticated;
grant all on public.invoice_billing_profiles,public.invoices,public.invoice_lines,public.invoice_presentations to service_role;
grant select on public.invoice_billing_profiles,public.invoices,public.invoice_lines,public.invoice_presentations to authenticated;
create policy invoice_profiles_select on public.invoice_billing_profiles for select to authenticated using(private.is_admin());
create policy invoices_select on public.invoices for select to authenticated using(private.is_admin());
create policy invoice_lines_select on public.invoice_lines for select to authenticated using(private.is_admin());
create policy invoice_presentations_select on public.invoice_presentations for select to authenticated using(private.is_admin());

-- SECURITY DEFINER mutations gate every step with active admin and entity constraints.
create function public.save_invoice_billing_profile(p_profile jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if not private.is_admin() then raise exception 'Admin access required';end if;
 if length(btrim(coalesce(p_profile->>'display_name','')))=0 then raise exception 'Display name required';end if;
 insert into public.invoice_billing_profiles(
  singleton,display_name,legal_name,address,tax_number,tax_registration_number,commercial_registration_number,
  email,phone,bank_name,account_name,account_number,iban,swift_code,default_payment_terms,default_footer,updated_at
 ) values(true, left(p_profile->>'display_name',200),left(coalesce(p_profile->>'legal_name',''),300),left(coalesce(p_profile->>'address',''),2000),
 left(coalesce(p_profile->>'tax_number',''),120),left(coalesce(p_profile->>'tax_registration_number',''),120),
 left(coalesce(p_profile->>'commercial_registration_number',''),120),left(coalesce(p_profile->>'email',''),300),
 left(coalesce(p_profile->>'phone',''),120),left(coalesce(p_profile->>'bank_name',''),200),
 left(coalesce(p_profile->>'account_name',''),200),left(coalesce(p_profile->>'account_number',''),120),
 left(coalesce(p_profile->>'iban',''),120),left(coalesce(p_profile->>'swift_code',''),80),
 left(coalesce(p_profile->>'default_payment_terms',''),2000),left(coalesce(p_profile->>'default_footer',''),2000),now())
 on conflict(singleton) do update set display_name=excluded.display_name,legal_name=excluded.legal_name,
 address=excluded.address,tax_number=excluded.tax_number,tax_registration_number=excluded.tax_registration_number,
 commercial_registration_number=excluded.commercial_registration_number,email=excluded.email,phone=excluded.phone,
 bank_name=excluded.bank_name,account_name=excluded.account_name,account_number=excluded.account_number,
 iban=excluded.iban,swift_code=excluded.swift_code,default_payment_terms=excluded.default_payment_terms,
 default_footer=excluded.default_footer,updated_at=now() returning id into v_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id) values(auth.uid(),'invoice.billing_profile.saved','billing_profile',v_id);
 return v_id;
end;$$;

create function public.save_invoice_document(
 p_invoice_id uuid,p_project_id uuid,p_invoice_number text,p_electronic_invoice_reference text,
 p_issue_date date,p_due_date date,p_currency text,p_tax_amount numeric,p_notes text,
 p_lines jsonb,p_presentation jsonb,p_issue boolean default false
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_client uuid;v_total numeric(18,2):=0;v_line jsonb;v_feature uuid;v_quantity numeric;v_rate numeric;
 v_current public.invoices%rowtype;v_index integer:=0;v_referenced uuid;
begin
 if not private.is_admin() then raise exception 'Admin access required';end if;
 select client_id into v_client from public.projects where id=p_project_id;
 if v_client is null then raise exception 'Choose a project assigned to a client before invoicing';end if;
 if coalesce(length(btrim(p_invoice_number)),0)=0 or length(p_invoice_number)>120 or
    p_issue_date is null or p_currency !~ '^[A-Z]{3}$' or p_tax_amount is null or
    p_tax_amount<0 or p_tax_amount>999999999999 or (p_due_date is not null and p_due_date<p_issue_date) or
    jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines)=0 or jsonb_array_length(p_lines)>100 or
    jsonb_typeof(p_presentation) is distinct from 'object' or length(p_presentation::text)>32768 or
    length(btrim(coalesce(p_presentation->>'seller_display_name','')))=0 or
    length(btrim(coalesce(p_presentation->>'buyer_name','')))=0 then
  raise exception 'Invalid invoice fields, dates, lines or billing snapshot';
 end if;
 if p_invoice_id is not null then
  select * into v_current from public.invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found';end if;
  if v_current.project_id<>p_project_id or v_current.client_id<>v_client then raise exception 'Invoice project/client cannot be reassigned';end if;
  if v_current.status in ('paid','partial','cancelled') or
     exists(select 1 from public.payments where invoice_id=p_invoice_id) then
      raise exception 'Invoice is locked after linked receipts or finalization';end if;
 end if;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  if coalesce(length(btrim(v_line->>'description')),0)=0 or length(v_line->>'description')>3000 then
   raise exception 'Each line requires a description (up to 3000 characters)';end if;
  v_quantity:=(v_line->>'quantity')::numeric;v_rate:=(v_line->>'unit_price')::numeric;
  if v_quantity<=0 or v_quantity>1000000 or v_rate<0 or v_rate>100000000000 or
   v_quantity::text='NaN' or v_rate::text='NaN' then raise exception 'Invalid line amount';end if;
  v_feature:=nullif(v_line->>'feature_id','')::uuid;
  if v_feature is not null and not exists(select 1 from public.features where id=v_feature and project_id=p_project_id) then
   raise exception 'Linked feature must belong to invoice project';end if;
  v_total:=v_total+round(v_quantity*v_rate,2);
 end loop;
 if v_total<=0 then raise exception 'Subtotal must be positive';end if;
 if p_invoice_id is null then
  insert into public.invoices(project_id,client_id,invoice_number,electronic_invoice_reference,issue_date,due_date,
   currency,subtotal,tax_amount,status,notes,created_by)
  values(p_project_id,v_client,btrim(p_invoice_number),nullif(btrim(p_electronic_invoice_reference),''),p_issue_date,p_due_date,
   p_currency,v_total,p_tax_amount,case when p_issue then 'issued' else 'draft' end,coalesce(p_notes,''),auth.uid()) returning id into v_id;
 else
  update public.invoices set invoice_number=btrim(p_invoice_number),electronic_invoice_reference=nullif(btrim(p_electronic_invoice_reference),''),
   issue_date=p_issue_date,due_date=p_due_date,currency=p_currency,subtotal=v_total,tax_amount=p_tax_amount,
   status=case when p_issue or v_current.status <> 'draft' then 'issued' else 'draft' end,
   notes=coalesce(p_notes,''),updated_at=now() where id=p_invoice_id returning id into v_id;
 end if;
 delete from public.invoice_lines where invoice_id=v_id;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  insert into public.invoice_lines(invoice_id,feature_id,description,quantity,unit_price,sort_order)
  values(v_id,nullif(v_line->>'feature_id','')::uuid,btrim(v_line->>'description'),
    (v_line->>'quantity')::numeric,(v_line->>'unit_price')::numeric,v_index);
  v_index:=v_index+1;
 end loop;
 insert into public.invoice_presentations(invoice_id,snapshot) values(v_id,p_presentation)
 on conflict(invoice_id) do update set snapshot=excluded.snapshot,updated_at=now();
 insert into public.audit_events(actor_id,action,entity_type,entity_id,details) values
 (auth.uid(),case when p_invoice_id is null then 'invoice.created' else 'invoice.edited' end,
 'invoice',v_id,jsonb_build_object('issued',p_issue,'line_count',v_index));
 return v_id;
end;$$;

create function public.issue_invoice_document(p_invoice_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_row public.invoices%rowtype;
begin
 if not private.is_admin() then raise exception 'Admin access required';end if;
 select * into v_row from public.invoices where id=p_invoice_id for update;
 if not found then raise exception 'Invoice not found';end if;
 if v_row.status<>'draft' then raise exception 'Only drafts can be issued';end if;
 if not exists(select 1 from public.invoice_lines where invoice_id=p_invoice_id) then raise exception 'Invoice has no lines';end if;
 update public.invoices set status='issued',updated_at=now() where id=p_invoice_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id) values(auth.uid(),'invoice.issued','invoice',p_invoice_id);
end;$$;

create function public.delete_invoice_document(p_invoice_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_invoice public.invoices%rowtype;
begin
 if not private.is_admin() then raise exception 'Admin access required';end if;
 select * into v_invoice from public.invoices where id=p_invoice_id for update;
 if not found then raise exception 'Invoice not found';end if;
 if v_invoice.status in ('partial','paid','cancelled') or exists(select 1 from public.payments where invoice_id=p_invoice_id) then
  raise exception 'Cannot delete an invoice with collection history';end if;
 delete from public.invoices where id=p_invoice_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,details) values
 (auth.uid(),'invoice.deleted','invoice',p_invoice_id,jsonb_build_object('invoice_number',v_invoice.invoice_number));
end;$$;

-- A linked payment is still a NORMAL company payment; it is not copied or posted twice.
-- Lock the invoice row to prevent concurrent over-collection, and require project+native currency parity.
create function private.validate_invoice_allocation() returns trigger language plpgsql security definer set search_path='' as $$
declare v_invoice public.invoices%rowtype;v_currency text;v_collected numeric;
begin
 if new.invoice_id is null then return new;end if;
 select * into v_invoice from public.invoices where id=new.invoice_id for update;
 if not found or v_invoice.status in ('draft','cancelled') then raise exception 'Only issued invoices accept payments';end if;
 select currency into v_currency from public.project_financials where project_id=v_invoice.project_id;
 if new.project_id<>v_invoice.project_id then raise exception 'Payment project must equal invoice project';end if;
 if v_invoice.currency<>v_currency then raise exception 'Invoice currency differs from project currency; link after matching currency values';end if;
 select coalesce(sum(amount),0) into v_collected from public.payments where invoice_id=new.invoice_id and id is distinct from new.id;
 if v_collected+new.amount>v_invoice.total_amount then raise exception 'Payment exceeds remaining invoice balance';end if;
 return new;
end;$$;
create trigger invoice_payment_validate before insert or update of invoice_id,amount,project_id on public.payments
for each row execute function private.validate_invoice_allocation();

create function private.refresh_invoice_payment_status() returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_paid numeric;v_total numeric;v_status text;v_due date;
begin
 for v_id in select distinct x from unnest(array[case when tg_op<>'INSERT' then old.invoice_id else null end,
                                                case when tg_op<>'DELETE' then new.invoice_id else null end]) x where x is not null loop
  select total_amount,status,due_date into v_total,v_status,v_due from public.invoices where id=v_id for update;
  if not found or v_status='cancelled' then continue;end if;
  select coalesce(sum(amount),0) into v_paid from public.payments where invoice_id=v_id;
  update public.invoices set status=case when v_paid>=v_total and v_total>0 then 'paid'
     when v_paid>0 then 'partial' when status='draft' then 'draft'
     when due_date is not null and due_date<current_date then 'overdue' else 'issued' end,
   updated_at=now() where id=v_id;
 end loop;
 return coalesce(new,old);
end;$$;
create trigger invoice_payment_refresh after insert or update of amount,invoice_id or delete on public.payments
for each row execute function private.refresh_invoice_payment_status();

-- Separate auditable invoice allocation link (does not modify company accounting values).
create function private.audit_invoice_payment_link() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.invoice_id is not null then
  insert into public.audit_events(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),'invoice.payment_allocated','invoice',new.invoice_id,
  jsonb_build_object('payment_id',new.id,'project_id',new.project_id,'amount',new.amount));
 end if;
 return new;
end;$$;
create trigger invoice_payment_audit after insert on public.payments
 for each row execute function private.audit_invoice_payment_link();

-- invoice on-demand status for due dates without cron jobs
create view public.invoice_balances with(security_invoker=true) as
 select i.id,i.project_id,i.client_id,i.invoice_number,i.electronic_invoice_reference,i.issue_date,i.due_date,
 i.currency,i.subtotal,i.tax_amount,i.total_amount,i.notes,i.created_at,
 case when i.status in ('paid','partial','draft','cancelled') then i.status
      when i.due_date<current_date then 'overdue' else 'issued' end as status,
 coalesce(receipts.paid,0)::numeric(18,2) as collected,
 (i.total_amount-coalesce(receipts.paid,0))::numeric(18,2) as outstanding
 from public.invoices i
 left join lateral (select sum(p.amount) as paid from public.payments p where p.invoice_id=i.id) receipts on true;
revoke all on public.invoice_balances from PUBLIC,anon;
grant select on public.invoice_balances to authenticated;

revoke all on function public.save_invoice_billing_profile(jsonb) from PUBLIC,anon;
revoke all on function public.save_invoice_document(uuid,uuid,text,text,date,date,text,numeric,text,jsonb,jsonb,boolean) from PUBLIC,anon;
revoke all on function public.delete_invoice_document(uuid) from PUBLIC,anon;
revoke all on function public.issue_invoice_document(uuid) from PUBLIC,anon;
grant execute on function public.save_invoice_billing_profile(jsonb) to authenticated;
grant execute on function public.save_invoice_document(uuid,uuid,text,text,date,date,text,numeric,text,jsonb,jsonb,boolean) to authenticated;
grant execute on function public.delete_invoice_document(uuid) to authenticated;
grant execute on function public.issue_invoice_document(uuid) to authenticated;
comment on table public.invoices is 'Invoice Studio receivables; do NOT add invoice totals to paid company revenue.';
commit;
