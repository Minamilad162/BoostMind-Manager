# Security plan — BoostMind OS

## Implemented in source

- Supabase Auth; no public signup UI; admin invitations via role-checked Edge Function.
- Profiles default to `developer` on Auth creation; only a privileged bootstrap/Edge function can grant `admin`.
- `profiles.role` does **not** have authenticated UPDATE privilege. Only `profiles.name` may be changed by its owner under RLS.
- Developer row-level project scope validated by SQL; project task updates via narrow RPC.
- Finance data separated from project metadata in `project_financials` with admin-only RLS.
- Payments, expenses, distributions, clients, links and audit records protected by admin-only RLS. Credential strings are accessible only to active admins through narrow column GRANTs and database RLS.
- Credentials v1.1.2: direct admin-only database storage as plaintext per product decision. No independent application-layer encryption. This is a security downgrade; avoid sensitive production credentials.
- Members: role/active editing via server-side role check; no self-demotion. 
- Frontend secrets are restricted to PUBLIC Supabase publishable/anon key. `.env` files ignored by Git.

## Mandatory before production

1. Verify RLS for both founders, assigned developer, unassigned developer and inactive developer with real authenticated sessions; attempt direct REST queries to `project_financials`, `payments`, `expenses`, `project_links`, `credential_records`.
2. Confirm project task assignment and project membership change results immediately reflect in authenticated direct reads and task RPC permissions.
3. Test admin-only credential create/read/delete; verify developer and unauthenticated API requests cannot see or write credentials; ensure audit logs never contain secret_text.
4. Verify Supabase Auth email invites, password reset redirect allow-list, sender reputation and email throttle configuration.
5. Implement controlled service-function rate limiting / monitoring for repeated failed attempts; consider MFA for both admins before allowing real customer credentials.
6. Review need for encrypted external credential storage, backups, credential rotation, and access revocation.
7. Check CSP policy on the target hosting (including Supabase API domain) and proper HTTPS-only asset connections.
8. Run `npm audit`, tests, production build, browser visual checks, mobile/touch/keyboard accessibility and high-stakes financial reconciliation tests.
9. Use separate staging and production Supabase projects. No unreviewed writes to production.

**Current verdict: NOT PRODUCTION VERIFIED.** Neither deployed functions nor RLS policies were exercised against a live database during this deliverable.
