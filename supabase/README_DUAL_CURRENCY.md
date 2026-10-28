# Supabase v1.1 — Fresh and incremental setup

Use only a NEW BoostMind OS Supabase project, not previous BoostMind sites or databases.

- **New database:** run `BoostMind_OS_v1.1_FRESH_INSTALL.sql` once. It sequentially applies initial schema and migration 002.
- **Already running greenfield v1.0:** apply ONLY `migrations/202610280002_dual_currency_reporting.sql` after confirming v1.0 was applied; use a development clone first and back up database.
- Seed no fake money, exchange rates, users or passwords. Activate founders via the documented secure `BOOTSTRAP_ADMINS.sql` process.
- If existing v1 rows have no exchange equivalents, UI will display incomplete-data warning, not fabricate FX. Reconcile those individually using audited admin operations before using KPI figures for decisions.
- The new RPC has added two numeric parameters, `p_amount_usd` and `p_amount_egp`. The old ten-parameter overload is removed to prohibit writing contracts without both values.

## Staging verification SQL (read only)
```sql
select table_name,column_name,data_type
from information_schema.columns
where table_schema='public'
  and table_name in ('project_financials','payments','expenses','distributions')
  and column_name in ('amount_usd','amount_egp')
order by table_name,column_name;

select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='save_project';
```
Expected: **8 currency-equivalent columns** and a single 12-argument `save_project` function.
