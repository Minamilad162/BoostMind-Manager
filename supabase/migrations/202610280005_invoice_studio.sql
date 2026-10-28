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
