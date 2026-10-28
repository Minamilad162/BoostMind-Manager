# Test plan — BoostMind OS v1.0

## Checks performed in this source assembly

- [x] Finance unit tests (7 total cases): profit 50/50, reimbursements and distributions, project task completion %, fiscal-year dates.
- [x] TypeScript TSX syntax transpilation of source files (using local global TypeScript).
- [x] Structural TypeScript review using temporary module declarations to catch internal component/type errors. **Not** equivalent to full package-based TypeScript verification.
- [ ] `npm ci`, full `tsc`, `vite build`, `npm audit` — blocked by npm registry not accessible in environment.
- [ ] Browser testing, screenshot comparisons, live Supabase RLS/security integration — not executed.

## Required user journeys in staging

1. Bootstrap both Admins via trusted SQL, authenticate. Developer cannot sign up publicly.
2. Admin invite Developer; invitation email received; new account logs in; Admin can deactivate/reactivate and change role.
3. Admin creates Client, Project with contract price/currency, features and tasks. Project overview and list reconcile.
4. Admin assigns project-wide access to Dev A and per-task access to Dev B. Check Dev A/B can see only allowed projects and update permitted tasks.
5. Test all four statuses by board and list; test project progress and priority filtering.
6. Admin records EGP receipt, planned expense, paid expense paid personally by Mina. Check net 50/50 and reimbursement credit. Check cannot settle more than due.
7. Add another USD project; verify reporting never blends amounts across currencies.
8. Add project URLs and saved login strings; show/hide/copy as Admin; ensure Developer direct API access to credential_records is rejected; check write audit without secret payload.
9. Cross-account data integrity: duplicate submit, two admins editing same project, stale form tab, date/negative numbers, URL sanitization and SQL constraints.
10. Mobile 320px/375px/768px and desktop 1440px; no clipped primary actions; keyboard focus and ESC close dialogs; check RTL text entry.
11. Netlify/Cloudflare deploy build, SPA fallback and login callback; verify no service key in bundle.

### Gate

No GO for production if `npm ci` or full TypeScript fails, if security/RLS not verified, or if net profit reconciliation differs from receipt/expense rows.

## v1.1 acceptance tests (to execute on new Supabase staging)
1. Apply migration 001 then 002; check all 4 money tables have USD and EGP fields; verify RPC `save_project` has the new signature and old signature is gone.
2. Log in as two admins and a developer. Admin can save project 10,000 USD / 520,000 EGP; developer must not read project_financials, payments, expenses or distributions directly via PostgREST.
3. Create EGP project with EGP 100,000 / USD 2,000 and receipt USD/EGP snapshots. Dashboard must add project equivalents, not sum native USD + native EGP.
4. Create receipts and paid expenses on two different dates with two different user-confirmed rates. Confirm historical equivalents do not change after editing contract values.
5. Verify company and partner profits using records of cash receipts and PAID expenses only. Planned expenses and payouts must not be deducted from net profit twice.
6. Verify Year (2006, 2026, next year), each Q1..Q4, January and December, including exactly first and last date of each period.
7. Verify mobile layout of period controls and dual-currency cards, focus/keyboard use, and developer not receiving financial data.
8. Attempt direct SQL/PostgREST insert of payment without both equivalents, or mismatched USD native amount; must fail. Currency edit of a project with payments must fail.
9. Inspect UI for FX incomplete warning when an older v1 row lacks manually confirmed conversion; do not permit a claim of complete totals.
10. Run npm ci, npm run typecheck, npm test, npm run build, npm audit --audit-level=high and browser smoke tests, then document results.


## v1.1.2 simple credentials acceptance tests (staging)
1. Apply migration 003 to v1.1.1; re-run schema cache if needed.
2. Create one login as admin; verify direct SELECT returns secret_text and Show/Hide/Copy are client-side only.
3. Confirm a Developer and unauthenticated browser cannot SELECT, INSERT, UPDATE or DELETE any credential via Supabase REST.
4. Confirm Audit records log only record ID/project ID on create/delete, never secret_text.
5. Change active admin to developer; existing session must lose credential access on next API request.
6. Prior ciphertext-only rows must remain in database but never be misrepresented as plaintext.
7. Do not store production master passwords or API service-role keys in this unencrypted feature.

## v1.2 invoice checks
- Run `npm test`: 24 offline tests including 7 invoice/parser/contract checks.
- `supabase/VERIFY_v1.2_READ_ONLY.sql`: run after migration on staging for tables, RLS, grants and RPC presence.
- Manual staging: draft/issued/edit/delete, ETA XML/JSON, duplicate UUID, client match, profile snapshot immutability, feature ownership, A4 print/PDF, partial/full payments, over-collection rejection, developer role unauthorized access, concurrent payment attempts.
- Must run npm ci/typecheck/build/audit and actual Supabase migration/RLS tests before production approval.
