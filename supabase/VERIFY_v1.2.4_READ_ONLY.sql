-- Safe read-only schema checks after applying migration 007 to BoostMind OS 1.2.3.
-- Check all results = PASS. This does NOT make a live database integration test.
with checks as (
 select 'split fields' as item, (
  select count(*)=5 from information_schema.columns
  where table_schema='public' and table_name='project_financials'
  and column_name in ('split_mode','mina_percent','bishoy_percent','mina_contract_share','bishoy_contract_share')) as passed
 union all select 'payment receiver columns',(
  select count(*)=2 from information_schema.columns where table_schema='public'
  and table_name='payments' and column_name in ('receiver_type','receiver_other'))
 union all select 'expense edit and delete policies retained',(
  select count(*)>0 from pg_policies where schemaname='public' and tablename='expenses'
   and (cmd='ALL' or cmd='UPDATE'))
 union all select 'expense audit trigger',exists(
  select 1 from pg_trigger where tgname='audit_expenses' and not tgisinternal)
 union all select 'expense consistency trigger',exists(
  select 1 from pg_trigger where tgname='expense_payout_consistency' and not tgisinternal)
 union all select 'payment contract limit',exists(
  select 1 from pg_trigger where tgname='payment_contract_limit' and not tgisinternal)
 union all select 'receiver required on new payments',exists(
  select 1 from pg_trigger where tgname='new_payment_receiver' and not tgisinternal)
 union all select 'partner payout function',exists(
  select 1 from pg_proc where proname='check_distribution' and pronamespace='private'::regnamespace)
 union all select 'new save project RPC',exists(
  select 1 from pg_proc where proname='save_project' and pronamespace='public'::regnamespace and pronargs=17)
 union all select 'project finance RLS',(
  select relrowsecurity from pg_class where oid='public.project_financials'::regclass)
 union all select 'expense RLS',(
  select relrowsecurity from pg_class where oid='public.expenses'::regclass)
 union all select 'developer finance denied by existing policy',(
  select count(*)=0 from pg_policies where schemaname='public' and tablename='project_financials' and coalesce(qual,'') ilike '%developer%')
)
select item,case when passed then 'PASS' else 'FAIL' end as result from checks order by item;
