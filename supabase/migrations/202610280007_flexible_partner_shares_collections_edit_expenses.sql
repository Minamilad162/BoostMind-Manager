-- BoostMind OS v1.2.4 — project-specific partner economics, collection receiver and expense amendments.
-- Apply ONLY after migrations 001–006 to the new BoostMind OS database; no legacy imports.
-- SAFETY: transactions are not recreated; existing projects default to 50/50.
begin;

alter table public.project_financials
 add column split_mode text not null default 'percentage' check (split_mode in ('percentage','amount')),
 add column mina_percent numeric(9,4) not null default 50 check (mina_percent between 0 and 100),
 add column bishoy_percent numeric(9,4) not null default 50 check (bishoy_percent between 0 and 100),
 add column mina_contract_share numeric(18,2) not null default 0 check (mina_contract_share >= 0),
 add column bishoy_contract_share numeric(18,2) not null default 0 check (bishoy_contract_share >= 0);

-- Preserve already stored amounts; assign the existing 50/50 baseline as a contract allocation.
update public.project_financials
set mina_contract_share=round(contract_amount/2,2),bishoy_contract_share=contract_amount-round(contract_amount/2,2);

alter table public.project_financials
 add constraint project_split_percentage_sum check (mina_percent+bishoy_percent=100),
 add constraint project_split_amount_sum check (mina_contract_share+bishoy_contract_share=contract_amount);

alter table public.payments
 add column receiver_type text check(receiver_type in ('mina_milad','bishoy_tamwil','company','other')),
 add column receiver_other text;
-- Existing records are deliberately left NULL (receiver was not recorded at the time).
alter table public.payments add constraint valid_payment_receiver check (
 (receiver_type is null and receiver_other is null)
 or (receiver_type='other' and nullif(btrim(receiver_other),'') is not null and length(btrim(receiver_other))<=160)
 or (receiver_type in ('mina_milad','bishoy_tamwil','company') and receiver_other is null)
);

create or replace function private.payment_receiver_required() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.receiver_type is null then raise exception 'Choose who received the payment';end if;
 return new;
end;$$;
create trigger new_payment_receiver before insert on public.payments
for each row execute function private.payment_receiver_required();

-- A client receipt cannot increase total lifetime collection above its signed project value.
-- Serialize writes at project level to avoid two simultaneous receipts bypassing the limit.
create or replace function private.check_project_collection_limit() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_contract numeric; v_used numeric;
begin
 perform 1 from public.projects where id=new.project_id for update;
 select contract_amount into v_contract from public.project_financials where project_id=new.project_id;
 if v_contract is null then raise exception 'Project contract value is missing';end if;
 select coalesce(sum(amount),0) into v_used from public.payments
 where project_id=new.project_id and id is distinct from new.id;
 if v_used+new.amount>v_contract then raise exception 'Collection exceeds the remaining contract amount';end if;
 return new;
end;$$;
create trigger payment_contract_limit before insert or update of amount,project_id on public.payments
for each row execute function private.check_project_collection_limit();

-- SQL is the source of truth: never accept split changes with invalid sums or payouts above entitlement.
create or replace function private.guard_partner_entitlements(p_project_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_f public.project_financials%rowtype;v_cash numeric;v_cost numeric;v_net numeric;
        v_code text;v_ratio numeric;v_paid numeric;v_contributed numeric;v_reimbursed numeric;
begin
 select * into v_f from public.project_financials where project_id=p_project_id;
 if not found then return;end if;
 select coalesce(sum(amount),0) into v_cash from public.payments where project_id=p_project_id;
 select coalesce(sum(amount),0) into v_cost from public.expenses where project_id=p_project_id and status='paid';
 v_net=greatest(0,v_cash-v_cost);
 for v_code in select unnest(array['mina','bishoy']) loop
  v_ratio=case when v_f.split_mode='amount' and v_f.contract_amount>0 then
      (case when v_code='mina' then v_f.mina_contract_share else v_f.bishoy_contract_share end)/v_f.contract_amount
      else (case when v_code='mina' then v_f.mina_percent else v_f.bishoy_percent end)/100 end;
  select coalesce(sum(amount),0) into v_paid from public.distributions
    where project_id=p_project_id and partner_code=v_code and kind='profit';
  if v_paid>round(v_net*v_ratio,2)+0.00001 then
   raise exception 'Change would make % profit payouts exceed their entitlement',v_code;
  end if;
  select coalesce(sum(amount),0) into v_contributed from public.expenses
    where project_id=p_project_id and status='paid' and paid_by=v_code;
  select coalesce(sum(amount),0) into v_reimbursed from public.distributions
    where project_id=p_project_id and partner_code=v_code and kind='reimbursement';
  if v_reimbursed>v_contributed then
   raise exception 'Change would leave % reimbursements higher than paid contributions',v_code;
  end if;
 end loop;
end;$$;

-- Existing payout trigger is preserved in name but now honors project-specific allocations.
create or replace function private.check_distribution() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_f public.project_financials%rowtype;v_collected numeric;v_cost numeric;
        v_existing numeric;v_credit numeric;v_ratio numeric;
begin
 perform 1 from public.projects where id=new.project_id for update;
 select * into v_f from public.project_financials where project_id=new.project_id;
 select coalesce(sum(amount),0) into v_collected from public.payments where project_id=new.project_id;
 select coalesce(sum(amount),0) into v_cost from public.expenses where project_id=new.project_id and status='paid';
 select coalesce(sum(amount),0) into v_existing from public.distributions
 where project_id=new.project_id and partner_code=new.partner_code and kind=new.kind;
 if new.kind='profit' then
  v_ratio=case when v_f.split_mode='amount' and v_f.contract_amount>0 then
    (case when new.partner_code='mina' then v_f.mina_contract_share else v_f.bishoy_contract_share end)/v_f.contract_amount
    else (case when new.partner_code='mina' then v_f.mina_percent else v_f.bishoy_percent end)/100 end;
  v_credit:=round(greatest(0,v_collected-v_cost)*v_ratio,2);
 else
  select coalesce(sum(amount),0) into v_credit from public.expenses
    where project_id=new.project_id and status='paid' and paid_by=new.partner_code;
 end if;
 if v_existing+new.amount>v_credit then raise exception 'Payout exceeds available partner balance';end if;
 return new;
end;$$;

create or replace function private.ensure_expense_edit_safe() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and old.project_id<>new.project_id then
  raise exception 'To move an expense to a different project, create a separate expense';
 end if;
 perform private.guard_partner_entitlements(case when tg_op='INSERT' then new.project_id else old.project_id end);
 return coalesce(new,old);
end;$$;
create trigger expense_payout_consistency after insert or update or delete on public.expenses
 for each row execute function private.ensure_expense_edit_safe();

create or replace function private.ensure_financial_split_safe() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_collected numeric;
begin
 select coalesce(sum(amount),0) into v_collected from public.payments where project_id=new.project_id;
 if v_collected>new.contract_amount then raise exception 'Contract cannot be lower than money already collected';end if;
 perform private.guard_partner_entitlements(new.project_id);
 return new;
end;$$;
create trigger project_split_payout_consistency after update on public.project_financials
 for each row execute function private.ensure_financial_split_safe();

-- Retire the old save_project RPC signature so callers cannot silently reset split values.
drop function if exists public.save_project(uuid,text,text,uuid,uuid,text,numeric,numeric,numeric,text,date,date);
create function public.save_project(
 p_id uuid,p_name text,p_description text,p_client_id uuid,p_owner_id uuid,p_status text,
 p_contract_amount numeric,p_amount_usd numeric,p_amount_egp numeric,p_currency text,
 p_contract_date date,p_due_date date,p_split_mode text,p_mina_percent numeric,p_bishoy_percent numeric,
 p_mina_amount numeric,p_bishoy_amount numeric
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_mina_amount numeric;v_bishoy_amount numeric;v_mina_percent numeric;v_bishoy_percent numeric;
begin
 if not private.is_admin() then raise exception 'Only admins can save projects';end if;
 if p_name is null or length(btrim(p_name))<1 or p_contract_amount is null or p_contract_amount<0
    or p_currency not in ('EGP','USD','SAR','EUR')
    or p_status not in ('planning','active','review','completed','on_hold')
    or p_contract_date is null or p_split_mode not in ('percentage','amount') then
  raise exception 'Invalid project input';end if;
 if p_split_mode='percentage' then
  if p_mina_percent is null or p_bishoy_percent is null
   or p_mina_percent<0 or p_bishoy_percent<0 or p_mina_percent+p_bishoy_percent<>100 then
   raise exception 'Partner percentages must total exactly 100';end if;
  v_mina_percent=p_mina_percent;v_bishoy_percent=p_bishoy_percent;
  v_mina_amount=round(p_contract_amount*v_mina_percent/100,2);
  v_bishoy_amount=p_contract_amount-v_mina_amount;
 else
  if p_mina_amount is null or p_bishoy_amount is null or p_mina_amount<0 or p_bishoy_amount<0
   or p_mina_amount+p_bishoy_amount<>p_contract_amount then
   raise exception 'Manual partner amounts must equal the contract amount';end if;
  v_mina_amount=p_mina_amount;v_bishoy_amount=p_bishoy_amount;
  v_mina_percent=case when p_contract_amount>0 then round(100*v_mina_amount/p_contract_amount,4) else 50 end;
  v_bishoy_percent=100-v_mina_percent;
 end if;
 if p_id is null then
  insert into public.projects(name,description,client_id,owner_id,status,contract_date,due_date)
  values(p_name,p_description,p_client_id,p_owner_id,p_status,p_contract_date,p_due_date) returning id into v_id;
 else
  if exists(select 1 from public.project_financials where project_id=p_id and currency<>p_currency)
   and (exists(select 1 from public.payments where project_id=p_id)
     or exists(select 1 from public.expenses where project_id=p_id)
     or exists(select 1 from public.distributions where project_id=p_id)) then
   raise exception 'Currency cannot change after financial activity';end if;
  update public.projects set name=p_name,description=p_description,client_id=p_client_id,owner_id=p_owner_id,
   status=p_status,contract_date=p_contract_date,due_date=p_due_date where id=p_id returning id into v_id;
  if v_id is null then raise exception 'Project not found';end if;
 end if;
 insert into public.project_financials(project_id,contract_amount,amount_usd,amount_egp,currency,
  split_mode,mina_percent,bishoy_percent,mina_contract_share,bishoy_contract_share)
 values(v_id,p_contract_amount,p_amount_usd,p_amount_egp,p_currency,
  p_split_mode,v_mina_percent,v_bishoy_percent,v_mina_amount,v_bishoy_amount)
 on conflict(project_id) do update set contract_amount=excluded.contract_amount,amount_usd=excluded.amount_usd,
 amount_egp=excluded.amount_egp,currency=excluded.currency,split_mode=excluded.split_mode,
 mina_percent=excluded.mina_percent,bishoy_percent=excluded.bishoy_percent,
 mina_contract_share=excluded.mina_contract_share,bishoy_contract_share=excluded.bishoy_contract_share;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,details)
 values((select auth.uid()),'project.saved','project',v_id,
 jsonb_build_object('new',p_id is null,'split_mode',p_split_mode,
 'mina_amount',v_mina_amount,'bishoy_amount',v_bishoy_amount,
 'mina_percent',v_mina_percent,'bishoy_percent',v_bishoy_percent));
 return v_id;
end;$$;
revoke all on function public.save_project(uuid,text,text,uuid,uuid,text,numeric,numeric,numeric,text,date,date,text,numeric,numeric,numeric,numeric) from PUBLIC,anon;
grant execute on function public.save_project(uuid,text,text,uuid,uuid,text,numeric,numeric,numeric,text,date,date,text,numeric,numeric,numeric,numeric) to authenticated;

-- Expense editing & deletion now explicitly allowed by RLS for administrators only.
-- RLS and audit_financial_change already exist; do not grant new access to developers or anon.
grant select,insert,update,delete on public.expenses to authenticated;
grant select,insert on public.payments to authenticated;

-- Keep helper functions private; only narrow authenticated RPC is exposed.
revoke all on function private.payment_receiver_required(),private.check_project_collection_limit(),private.guard_partner_entitlements(uuid),private.check_distribution(),private.ensure_expense_edit_safe(),private.ensure_financial_split_safe() from PUBLIC,anon,authenticated;

comment on column public.payments.receiver_type is 'Who physically received the money; older payments remain unknown rather than guessed';
comment on column public.project_financials.split_mode is 'percentage: percentages drive entitlement; amount: manual contract amounts drive entitlement';
commit;
