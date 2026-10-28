## v1.1.3 — Project access grouping and custom URL/title support
- Project selection required during creation of a saved resource.
- Links and saved logins shown inside each Project → Links & Accounts tab, also accessible globally.
- Added Other → custom service/category, free-text Title, and optional URL field.
- Added migration 004 with safe existing-record preservation and admin-only RLS/column grants.
- No changes to financial data, project/task workflows, or partner sharing.

# v1.1.2 — Credentials without Edge Vault

- Plain-text password/username storage via admin-only PostgREST RLS; in-app local show/hide/copy.
- Additive SQL migration 003 with audited writes, narrow GRANTs, no data deletion.
- Removed `vault` Edge Function only; preserved member-management functions, finance and project logic.
- Security tradeoff explicitly disclosed.

## v1.1.1 — Vault connectivity diagnostics and CORS header compatibility (2026-10-28)

- Expanded `vault` Edge Function CORS preflight headers to allow SDK request retry and optional trace-context headers.
- Improved frontend vault errors: distinguish browser fetch/network/CORS failures from Supabase relay failures and actionable HTTP responses (401/403/404/503). Password and secret values remain excluded from diagnostics.
- No changes to Supabase SQL migrations, AES-GCM encryption, owner permissions, project data, or finance logic.
- **Deployment requirement:** the `vault` Edge Function must be deployed separately on the intended Supabase project; downloading/redeploying the frontend alone will not fix a missing function. The encryption key `BOOSTMIND_VAULT_KEY` must be configured server-side (random 32 bytes in base64).
- **Verification:** offline unit tests and source contract check only; live Supabase invocation and npm build were not exercised in this environment.

# Changelog

## 1.0.0 — 2026-10-28 — Greenfield source foundation

- NEW UI: light premium BoostMind executive dashboard, projects, feature groups, task Kanban/list, clients, finance, team, vault and settings.
- NEW BRAND: original BoostMind SVG wordmark and matching colors.
- NEW DATABASE: initial greenfield PostgreSQL schema, admin-only finances, per-project developer scope, RPCs and RLS.
- NEW SECURITY: AES-GCM Edge Function credentials vault, server-side invitations and role management.
- NEW FINANCE LOGIC: 50/50 realized profit, separate payments/planned costs/paid expenses, partner payout and reimbursement balances, fiscal-year and currency isolation.
- NEW TESTS: 7 passing finance and security-contract tests.
- OUTSTANDING: npm build and browser/Supabase integration checks unavailable in this environment; release is source-only, not production-approved.
- No compatibility with older apps, no demo dataset, no production modifications.

## v1.1.0 — 2026-10-28 — USD/EGP concurrent financial reporting
- Added user-confirmed USD and EGP contract equivalents, and per-payment/expense/payout conversion snapshots; protected data remains admin-only via existing RLS.
- Added independent migration 002 with server-side numeric checks and updated project-saving RPC; prevents unsafe currency changes after recorded financial activity.
- Replaced currency filter with Year / Quarter / Month selector (years start 2006); aligned dashboard and finance period totals, chart and founder profit shares.
- Both currencies now appear in project cards/detail, financial KPIs, ledgers, and company finance rows.
- Added FX-missing reconciliation warnings rather than silently guessing historical exchange rates.
- Added reporting unit tests and documentation. No legacy project support/imports; no original BoostMind repository change.
- Build/typecheck not verified due unavailable npm registry; no live database deployment or migration applied.

## v1.2.0 — Invoice Studio from BoostMind v0.11.22 reference (2026-10-28)
- Ported original A4 live preview, editable invoice fields, Billing Profile, ETA XML/JSON local import, Draft/Issue/Edit/Delete, conditional read-only payment statuses, browser Print/PDF.
- Adapted clients, project relationship, features and finance to this **new** database only; no old-data or legacy back-end integration.
- New SQL `202610280005_invoice_studio.sql` adds invoice domain, billing profile, tax/legal client fields, invoice-linked payments, strict Admin RLS, audited RPCs, currency/project/amount validation and overdue status.
- Financial statement rule unchanged: only receipts in `payments` determine company cash and partner profit, not invoice totals.
- Added `InvoiceWorkspace` via global Invoices navigation and per-project button, with optional invoice assignment in payment entry.
- Added read-only post-migration verification SQL and offline tests. Full build/Postgres execution require staging environment with dependencies.
