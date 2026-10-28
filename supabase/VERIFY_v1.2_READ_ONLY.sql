-- Run AFTER migration 005. Read-only metadata verification; does not touch data.
select 'required tables' as check_name,
  to_regclass('public.invoice_billing_profiles') is not null and
  to_regclass('public.invoices') is not null and
  to_regclass('public.invoice_lines') is not null and
  to_regclass('public.invoice_presentations') is not null and
  to_regclass('public.invoice_balances') is not null as pass;
select 'RLS invoice tables' as check_name,
  count(*)=4 as pass
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('invoice_billing_profiles','invoices','invoice_lines','invoice_presentations') and c.relrowsecurity;
select 'no anonymous direct table reads' as check_name,
  not has_table_privilege('anon','public.invoices','SELECT') and
  not has_table_privilege('anon','public.invoice_lines','SELECT') and
  not has_table_privilege('anon','public.invoice_presentations','SELECT') as pass;
select 'no direct authenticated invoice write' as check_name,
  not has_table_privilege('authenticated','public.invoices','INSERT') and
  not has_table_privilege('authenticated','public.invoices','UPDATE') and
  not has_table_privilege('authenticated','public.invoice_lines','DELETE') as pass;
select 'invoice functions installed' as check_name,
 to_regprocedure('public.save_invoice_document(uuid,uuid,text,text,date,date,text,numeric,text,jsonb,jsonb,boolean)') is not null and
 to_regprocedure('public.issue_invoice_document(uuid)') is not null and
 to_regprocedure('public.delete_invoice_document(uuid)') is not null and
 to_regprocedure('public.save_invoice_billing_profile(jsonb)') is not null as pass;
select 'payment invoice link exists' as check_name,
 exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='invoice_id') as pass;
select 'client billing columns' as check_name,
 count(*)=6 as pass from information_schema.columns
 where table_schema='public' and table_name='clients'
   and column_name in ('legal_name','address','tax_number','tax_registration_number','commercial_registration_number','primary_contact');
