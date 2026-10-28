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
