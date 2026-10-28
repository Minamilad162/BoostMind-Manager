# BOOSTMIND OS — Canonical project context

**Version:** 1.0.0 greenfield source baseline · **Date:** 2026-10-28

## Purpose and approved decisions

Build BoostMind's private, modern project and finance workspace from the user-approved **light-theme screens**, not from the prior legacy BoostMind application. Copy only the real BoostMind logo/identity and high-level design tokens; **no migration or compatibility with old company projects**.

### Users
- Two founder Admins: Mina and Bishoy (actual email addresses must be provided in Supabase bootstrap).
- Two initial Developer accounts planned; future admins/developers can be invited.
- Developers see only accessible project/task delivery data; they **never receive direct financial or vault data access**.

### Approved brand
- White cards, light background `#F4F7FB`, deep navy sidebar `#11152D`, purple `#6B5CE0`, blue `#4F7FF1`, restrained animation, compact premium controls.
- `public/boostmind-logo.svg` is the real historical BoostMind branded wordmark, not a placeholder.
- English-first interface with `dir=auto` on user-input description fields and modular design ready for later i18n/RTL review.
- Mobile navigation drawer; Kanban horizontally snaps rather than shrinking cards.

### Project structure
- `src/App.tsx`: app shell, screen modules and dialogs. Extract to feature folders during the next controlled refactor **after** first real dependency build and E2E pass; preserve all accepted flows.
- `src/lib/types.ts`: typed data contracts.
- `src/lib/finance.ts`: pure, unit-tested derived finance rules.
- `src/lib/api.ts`: Supabase data mutations/RPC/Edge function wrappers.
- `src/auth/Auth.tsx`: session and identity.
- `src/components/UI.tsx`: reusable UI primitives.
- `src/styles.css`: approved visual design tokens and responsive shell.
- `supabase/migrations/202610280001_initial.sql`: sole schema source for this new application.
- `supabase/functions`: privileged team member invites and management only. Credential strings now use admin-only PostgREST.

### Primary business flow

Invite members → add client → create project (atomic project + finance RPC) → assign owner / project access → define features → create/assign tasks → update Kanban statuses → receive client payments / record paid & planned expenses → view net profit and partner 50/50 distribution → record partner payouts and expense reimbursements → store links/credentials in protected vault.

### Future work explicitly deferred

- Electronic invoice screen integration **only after** user supplies invoice example.
- Automated 2FA enforcement, production monitoring/rate limiting policy, email notification workflow, multi-currency FX conversion, signed agreement attachments, cross-period financial reconciliations.

### Current state

Source and schema created. Offline finance and security-contract checks tested, syntax transpilation completed, TypeScript structural review with temporary module stubs completed. Actual npm / Vite / Edge / Supabase integration testing blocked by unavailable dependencies and no connected fresh Supabase project. Never claim live production readiness without evidence.

### Change-control rule

Maintain this file, CHANGELOG and LOGIC_REGISTRY with each approved change. Do not alter profit rules, RLS scope or the light-theme baseline without explicit review. No placeholder operational data in production paths.

### Approved screen references

The image files under `docs/design-reference/` preserve the approved UI concept baseline. They are visual references, **not** screenshots captured from the new working React app.


## v1.1.2 credential decision
Requested simplicity: direct database string storage for admin-only project logins. Additive migration 003; no vault Edge Function. Plaintext storage risk accepted as an explicit feature change, not a secure secrets-manager equivalent.

## 2026-10-28 — v1.1.3 Project access grouping
- Approved: every custom link/login belongs to a selected project, with required project selection on creation.
- Both Project → Links & Accounts and global Saved Logins operate on the exact same Supabase project-scoped tables. Project view defaults to that project; global view requires explicit selection.
- Additional custom records support known categories and **Other** (custom category), user-entered title, optional URL/username/password; at least one URL or password is required.
- Schema migration: `202610280004_project_scoped_resources.sql` adds nullable `credential_records.access_url` and updates admin-only RLS and narrow grants. No data deletion/reparenting.
- Keep plain text credential handling as explicitly requested, but do not imply encrypted storage or recommend production master secrets.

## v1.2 — Invoice Studio integration (approved implementation, pending live QA)
- Source of UI and ETA parser: user-provided BoostMind v0.11.22 archive, adapted to the independent v1.1.3 schema. No historical data or previous Supabase connection is used.
- Current invoice source files: `src/invoice/*`; navigation in `src/App.tsx`; controlled SQL migration `supabase/migrations/202610280005_invoice_studio.sql`.
- Company billing profile, invoice lines, project-client link, feature link, tax/ETA reference, browser print/PDF and cash allocation supported.
- Existing `payments` remain sole source of cash collected. Invoice totals and receivables must never be added to collection and partner profit sums.
- Developers may not read or mutate invoices or billing profile. Admin-only RLS / atomic RPC; amounts validated in DB.
- Full typecheck/Vite build and live SQL/RLS tests remain explicit release gates.
