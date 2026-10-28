# BoostMind OS — Greenfield v1.2.0

A **new, standalone** BoostMind project-management, task-delivery and financial workspace. This is **not** an upgrade to any existing project/repository/database and contains **no legacy import, migration, backward compatibility or demo company records**. The original BoostMind logo and approved light UI palette are retained.

## Included modules

- **Secure login** using Supabase Auth (no public signup).
- **Executive Dashboard** — by calendar reporting period with USD and EGP together: signed contract value, received payments, paid costs, cash-based net profit, founder shares, month-by-month chart and project/task pulse.
- **Projects** — name, client, description, contract value, owner, deadline, status, project members, progress.
- **Features** — project scope groups.
- **Tasks** — Kanban and List, task status, priorities, due date, per-task assignment, project-wide assignment.
- **Clients** — contact, email, phone, WhatsApp URL, notes.
- **Finance** — client receipts, paid and planned expenses, company/Mina/Bishoy payment source, equal 50/50 partner economics, payouts and expense reimbursements, per-project ledgers.
- **Team** — invite Admin/Developer, change role, deactivate/reactivate users. Admins cannot change their own access through the management function.
- **Saved Logins** — project website, DB, hosting and GitHub URLs, plus admin-only username/password strings saved directly in Supabase with local show/hide/copy. These strings are NOT application-encrypted.
- **Settings** — account details, reset/new password.
- **Responsive desktop/mobile** — dark navy sidebar, purple/blue brand accents, white cards, mobile menu and horizontally snappable Kanban lanes.

**Not included yet:** government ETA live submission/signature (the invoice module supports local ETA import, editing, reference IDs and browser print/PDF); drag-and-drop persistence (status changes currently work via accessible select controls); attachment storage, full accounting ledger, notification delivery and live deployments.

## Stack

React 19 + TypeScript + Vite; Supabase Auth / Postgres / RLS (Edge Functions retained only for privileged member management); Netlify-ready frontend; GitHub Actions and Dependabot templates. The **actual BoostMind wordmark SVG** is `public/boostmind-logo.svg`, reproduced from the existing private BoostMind repository's original public asset; the navigation mark derives from the same mark geometry.

## Local setup (new environment only)

1. Install **Node.js 22+** and create an entirely **new** Supabase project. Do not point these files at a pre-existing BoostMind or customer database.
2. From a network-enabled development environment, run `npm install` to resolve dependencies and generate `package-lock.json`; **commit the resulting lockfile** and verify it with `npm ci`. The supplied build environment could not resolve the npm registry, so this source snapshot has no generated lockfile or verified npm/Vite build.
3. Copy `.env.example` to `.env.local`. Set `VITE_SUPABASE_URL` and the **publishable/anon** Supabase key only. **Never** put the service-role key, admin passwords or any private keys in the frontend.
4. For a new database, apply `supabase/BoostMind_OS_v1.2_FRESH_INSTALL.sql` once (includes all new-system migrations 001–005 in order). For an existing v1.1 or v1.1.1 database, apply only `supabase/migrations/202610280003_simple_credentials.sql` after backing up your data and testing in staging. RLS and explicit grants are retained.
5. In **Supabase Dashboard → Authentication → Users**, invite the two founders using their real email addresses, then update `public.profiles` for **Mina** and **Bishoy** to role `admin`. The guidance file `supabase/BOOTSTRAP_ADMINS.sql` is deliberately transaction-rolled-back until the real emails and SQL review are completed; it cannot silently create or authorize unknown accounts.
6. No Vault encryption key is required. Project login strings are saved directly via an admin-only table; do not place a service-role key into frontend environment variables. Privileged team-management functions still need normal Supabase server-side configuration.
7. Only deploy the **two** team-management Edge Functions if you use invitations/role changes: `invite-member` and `manage-member`, keeping JWT verification enabled. No `vault` Edge Function is deployed or called. Configure Auth `Site URL` and redirect allow-list for your app.
8. Start with `npm run dev` and sign in with a founder account. The initially empty workspace will show empty states. Create a client, project, project features and tasks, then record a receipt and expense.
9. Run `npm run typecheck`, `npm test`, `npm run build` and `npm audit --audit-level=high`. Production deployment requires **all** checks to pass plus the database/security acceptance plan below.

### Deployment

Create a **new private GitHub repository**. Push the source and the generated verified package lockfile. Connect Netlify to that repository and the `main` branch (or another separate domain/branch). `netlify.toml` contains the SPA fallback and security headers. Set only the two public `VITE_` variables in Netlify. Supabase Edge secrets belong in Supabase, not Netlify or GitHub. **No existing BoostMind project/site is modified by this ZIP.**

## Role safety

| Action | Admin | Developer |
| --- | :---: | :---: |
| Read/manage all projects | ✓ | Assigned projects only, read |
| Create/edit projects, features and tasks | ✓ | — |
| View tasks and change permitted status | ✓ | Own / assigned project |
| See client directory | ✓ | — |
| Read contract amounts, receipts and expenses | ✓ | — |
| Settle founder shares | ✓ | — |
| View/edit saved login strings | ✓ | — |
| Invite/change/deactivate accounts | ✓ | — |

The `projects` table **does not contain contract amounts or currencies**. Sensitive values live in admin-RLS `project_financials`. Direct API reads by a developer must not reveal amounts. The saved-login table has column-restricted authenticated grants and active-admin-only RLS. Strings in `secret_text` are plaintext in the database; developers and anonymous clients are blocked by database access rules.

## 50/50 financial policy

- **Contracted** = sum of project contract value with contract date in selected FY (expected value; not cash).
- **Collected** = sum of actual client receipts within selected FY.
- **Paid costs** = sum of expenses marked Paid with payment date inside selected FY; Planned is excluded.
- **Realized net profit** = collected − paid project costs, separately per currency.
- **Each founder's economic profit share** = 50% of *lifetime* realized net profit per project. Financial report FY headline figures are period-based; the project detail ledger is lifetime-based.
- **Expense responsibility** = 50% each, economically reflected in net profit. If a founder pays a project expense personally, that *full amount* is recorded as a reimbursement liability to that founder so that the final cost burden is equal after reimbursement and shared profit.
- **Profit balance** = partner economic share − recorded profit distributions.
- **Reimbursement balance** = personally funded paid expenses − recorded reimbursements.
- Different original currencies are converted using **manually confirmed USD and EGP equivalents captured for every contract and cash transaction**. There is no report currency switch and no automatic market FX lookup.
- Reporting calendar year is **January–December**, since another company’s July–June accounting year must not be assumed for BoostMind. Adjust only after confirming BoostMind's financial-year policy.

## Important limitations / current verification status

- This is a **source deliverable**, not a live production deployment.
- No Supabase project connection or real production database migration was applied.
- No old project assets, records, secrets or database values were imported.
- Offline finance unit tests were executed successfully. `npm install`, `npm ci`, a full React/Vite build, npm dependency audit, browser E2E, Edge Function deployment and RLS live tests **have not been completed** in the current execution environment because external npm packages could not be downloaded and a new Supabase project was not connected.
- This release is **NOT production-approved** until the release checklist is satisfied.
- Amounts and contacts appearing in prior UI concept screenshots were *illustrative*; the delivered database starts empty.

See `docs/PROJECT_CONTEXT.md`, `docs/SECURITY_PLAN.md`, `docs/LOGIC_REGISTRY.md`, `docs/TEST_PLAN.md`, `docs/RELEASE_STATUS.md` and `CHANGELOG.md` for engineering governance.

## v1.1 — Dual-currency valuation and date filters (2026-10-28)

**Scope:** Greenfield BoostMind OS only. The original BoostMind website/repository/database are not modified or integrated.

- Apply `supabase/migrations/202610280002_dual_currency_reporting.sql` **after** `202610280001_initial.sql`. For a completely fresh database, execute `supabase/BoostMind_OS_v1.1.3_FRESH_INSTALL.sql`, which contains migrations 001, 002, and 003 in order.
- Project contracts require original currency amount, its manually entered **USD equivalent**, and its manually entered **EGP equivalent**. When original currency is USD or EGP, that equivalent is locked equal to the original amount. The UI displays the recorded implied EGP/USD rate for transparency. For EUR/SAR, both USD and EGP equivalents are manually entered.
- Payment, expense, and payout dialogs require USD and EGP equivalents **at transaction time**. The form proposes amounts from the project's contract ratio when available, but users must confirm the actual transaction-day values. The database validates both equivalents, rejects missing, zero/negative or inconsistent native-currency values, and stores them as records. The historical rate is never silently revalued.
- Dashboard and Finance display **USD above EGP** for contracts, receipts, paid expenses, realized profit, and each founder's 50% economic share. Neither screen offers a currency toggle.
- Reporting filters: Year, Quarter Q1–Q4, Month; years begin with **2006** and extend as calendar years progress. Period filters use the **calendar year (January–December)**; project contract date determines contract value, payment date determines receipts, and paid-expense date determines costs. Planned expenses and partner payouts do not reduce period net profit again.
- The chart uses EGP for bar heights and shows both USD/EGP in hover details. The per-project table is explicitly **lifetime**, while KPI cards follow the selected period.
- If a v1 record exists without an exchange snapshot, v1.1 *does not invent an exchange rate*. That record is excluded from dual-currency totals and a prominent incomplete-data warning is shown. Its values require manual reconciliation in a subsequent controlled admin workflow before accurate totals can be claimed. No compatibility imports for older BoostMind projects are included.
- Once a project has cash transactions, the project currency cannot be changed via `save_project`; previous transaction native amounts must retain their original currency.

### Verification state for v1.1

- Node offline unit tests covering FY/Q/month, mixed currencies, partner shares, and FX snapshot immutability: **PASS** (run `npm test` after installing dependencies; Node 22 `--experimental-strip-types` also works standalone).
- TypeScript syntax / JSX parser diagnostics: **0** from global TypeScript `transpileModule`.
- `npm install`, Vite build, full typecheck, browser E2E and live Postgres/Supabase integration: **NOT VERIFIED** in this environment (npm registry DNS `EAI_AGAIN`, no new Supabase deployment). Do not deploy to production until these checks and live RLS/migration verification pass.



## v1.1.2 — Simple admin-only saved logins (replaces Vault Edge Function)

- The **Saved Logins** interface now saves Login/Password strings directly into `public.credential_records.secret_text` via Supabase PostgREST. No `vault` Edge Function, `BOOSTMIND_VAULT_KEY`, or extra service-key setup is required.
- Create, list, show/hide, copy and delete are handled from the existing project UI. Show/hide does **not** make a second network call; it toggles locally after admin data loads.
- This is **plain text stored in the database**. It is NOT AES encrypted by the application. Only active `admin` accounts can read/write using server-enforced RLS. Avoid storing root credentials, production database owner credentials, personal passwords, API keys or recovery codes here. Consider a dedicated secrets manager for those.
- For EXISTING v1.1.1 installations, run `supabase/migrations/202610280003_simple_credentials.sql` in Supabase SQL Editor. Do not rerun initial SQL. For a completely fresh database use `supabase/BoostMind_OS_v1.1.3_FRESH_INSTALL.sql` instead.
- The migration is additive and does NOT delete previous AES ciphertext. Previously encrypted entries will be identified as old-format and must be re-entered to use the new direct storage method; there is no automatic conversion. Do not rotate or delete any old vault keys until you have migrated any old entries you need.
- The `invite-member` and `manage-member` Edge Functions remain in the code because they perform privileged user management. Only the **vault** function has been removed.
- Audit records cover credential **write/delete events only**, not viewing (direct PostgREST reads cannot reliably audit every reveal).
- As with prior versions, production build and live Supabase RLS were not verified in this environment. Apply and test in staging before touching existing data.


## v1.1.3 — Project-scoped links and logins (2026-10-28)

- Global **Saved Logins** now starts with an explicit project selector (no implicit first-project selection).
- Every new link/login requires a project in the add dialog. When adding within a project, it is preselected, but can still be reviewed.
- Every project has its **Links & Accounts** tab with the same live records and standard project URLs; the global page is another way to access that same project data.
- Choose a known Service/Category or **Other** and type a custom category, plus a required free-text Title.
- Each additional record may store a URL, a login/password, or both. URL-only records no longer require fake passwords.
- Apply **only** `supabase/migrations/202610280004_project_scoped_resources.sql` to an existing v1.1.2 database. Existing records remain attached to their original project.
- For an entirely new database use `supabase/BoostMind_OS_v1.1.3_FRESH_INSTALL.sql`. **Do not run Fresh Install on an existing database**.
- Standard website/database/hosting/GitHub links remain under `project_links` and are already tied to the project.
- New project-specific records use `credential_records.access_url`, existing project foreign key and admin-only RLS. Plaintext passwords remain plaintext; do not store production root credentials.
- No Edge Functions are used for the saved links/logins. Team administration Edge Functions are unchanged.

## v1.2.0 — Invoice Studio (adapted from user's BoostMind v0.11.22 source)

**New integration only**: old BoostMind v0.11.22 was used as a read-only UI/behavioral reference. No old database, data, API keys or authentication are imported or used. The invoice editor uses the original light A4 layout, BoostMind logo, ETA import parser, line editor, company billing profile and invoice-specific snapshots, now backed by a new migration.

### Upgrade an existing v1.1.3 installation

1. Make a database backup and test on **staging** first.
2. Run **only** `supabase/migrations/202610280005_invoice_studio.sql` in Supabase SQL Editor. This creates the new billing/invoice tables, a payment-to-invoice reference, secured operations and client legal/tax fields. It preserves existing projects, clients, receipts, expenses and logins. Do not rerun the old initial schema.
3. Deploy the entire updated React frontend. The new Admin sidebar has **Invoices**; project detail has an **Invoices** button.
4. Configure **Billing profile** (seller, tax numbers, bank details), then create a Client and a Project linked to that Client. Fill the Client's legal and tax fields if available.
5. In Invoices, create a draft; optionally **Import ETA XML/JSON** to prefill (local browser parsing only). Review the client/project match, details, invoice number, currency, lines, tax and transfer info. Save draft or Issue.
6. Click **Print / PDF** to use browser print / Save as PDF; this is a printable invoice, **not a government submission** to ETA.
7. Under Finance → **Record client payment**, optionally select an issued invoice from the same project, in the **same currency**. The SQL validates the link, disallows paying more than the outstanding amount and recalculates Paid/Partial status. A project receipt without an invoice remains supported.

### Fresh install

On an entirely empty Supabase database, run **only** `supabase/BoostMind_OS_v1.2_FRESH_INSTALL.sql`. This concatenates v1.1.3's greenfield setup and the v1.2 invoice migration, in that order. **Never run it on a populated database.** For existing v1.1.3 use the update-only migration above.

### What the UI contains

- Admin invoice register: number, e-invoice reference, client, project, issue/due dates, status, total, collected, outstanding.
- Editable Billing Profile: BoostMind name, legal/tax/commercial IDs, contact details, bank, account, IBAN, SWIFT and default terms/footer.
- Invoice Studio (original v0.11.22 UX): inline client/project matching, editable project display title/description, manually assigned invoice number and ETA UUID, currency/date controls, optional feature-linked item lines, quantity/unit-price, manual tax, per-invoice seller/buyer/bank details, terms, optional CBE exchange-rate explanatory note, public and internal notes, live A4 preview and browser Print/PDF.
- ETA XML/JSON parsing **in the browser** with 5MB limit, conservative matching by tax number and project, duplicate UUID warning, and editable imported lines. Source ETA status does not automatically issue an invoice.
- Save Draft, Issue, edit issued/overdue while **no linked receipts exist**, or delete while no collection history exists; all edits controlled via audited server-side RPC.

### Accounting safeguards

**Invoiced ≠ Received.** Invoices represent amounts billed and outstanding; only the existing `payments` table feeds actual company revenue and 50/50 profit. Linking a payment to an invoice does not create another receipt or duplicate accounting totals. Invoice receipt linking requires the invoice currency to equal the project's original currency; mismatched currencies must be reconciled in a separately approved FX workflow and cannot be silently converted.

Existing unallocated payments are left as they were; historical receipts **are not automatically attached to invoices**. The billing profile is copied as a per-invoice snapshot, so later edits to company defaults do not rewrite old invoices. The invoice list derives overdue status by due date even if no background job runs.

### Verification limitations

- Node 22 offline tests include ETA XML/JSON parsing, client/project matching and static database authorization/finance contract checks; run `npm test`.
- Source has been syntax-checked with TypeScript parser. Full `npm install`, `npm run typecheck`, `npm run build`, browser print review, actual Supabase SQL execution and live RLS/transaction tests need a **network-enabled development/staging environment**. The current artifact is source for testing, **not a production-certified deployment**.
- The supplied ETA import is for drafting/prefilling. It does not file, sign, validate, cancel or submit government e-invoices.
