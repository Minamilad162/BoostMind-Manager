# v1.0 source release evaluation — 2026-10-28

**Decision: NO-GO FOR LIVE PRODUCTION.**

## Delivered

- Greenfield React/TS/Vite source, responsive UI modules with BoostMind original logo.
- Single initial Supabase schema (tables, constraints, RLS, RPCs), admin onboarding SQL reference.
- Simple admin-only saved logins plus invite and member-management Edge Function source.
- Pure finance calculations and 7 passing unit / security contract tests.
- Deployment, CI and security guidance.

## Still blocked / not claimed

- npm dependency resolution, `package-lock.json`, full TS compiler against real package types, Vite bundle, npm vulnerability scan.
- Running against a fresh Supabase project, applying SQL migration in a transaction, verifying RLS on authenticated sessions.
- Deploying/validating Edge Functions with real Supabase secrets, user invitations and data.
- Browser-level visual regression against user-approved screenshots.
- External domain, Netlify deployment, DNS/HTTPS/rollback and real invoice example.

### Needed to release

Generate/commit lockfile and run CI on connected GitHub, deploy to staging Supabase, apply script, bootstrap admins, deploy team-management Edge Functions with JWT, execute TEST_PLAN and SECURITY_PLAN, and only then deploy production.

## Non-goals

No old DB support/imports, no migration of old project records, no production database changes, no real user/password seeds.

### v1.1.0 — Dual-currency + period filters
- Static TS/TSX parsing PASS; Node reporting tests PASS.
- Full npm install / production build / typecheck / dependency audit BLOCKED: npm registry DNS `EAI_AGAIN` in build environment.
- SQL syntax and RLS behavior have not been validated on a fresh Supabase instance. Migration 002 must be executed and verified in non-production before any production rollout.
- Never report financial totals as complete while the missing FX warning is present.
- Decision: SOURCE DELIVERY / NOT PRODUCTION APPROVED.

### v1.1.2 vault simplification
- Frontend and SQL source modified; live Supabase deployment/authorization not yet tested.
- Passwords now stored as plaintext database strings behind active-admin RLS.
- Vault Edge Function no longer required. Team invite/manage functions unchanged.

## v1.1.3 validation gate
- Migration 004 and per-project resource UI implemented in source, without touching live Supabase.
- `npm test` and TSX parser diagnostics to be recorded in release response.
- Live SQL execution, admin vs developer RLS tests, browser navigation and production bundle build need a connected staging environment before production approval.

## v1.2 Invoice Studio — source implemented, not yet production approved
- UI old-source adaptation and new SQL migration source complete.
- Offline unit + static contract tests: PASS (24/24).
- TS/TSX parser syntax diagnostics: zero.
- Temporary type verification with local module shims completed with zero errors; this is not official npm-based typecheck.
- npm/Vite build: NOT RUN — registry DNS unavailable.
- Supabase migration, RLS and payment concurrency verification: NOT RUN — no connected staging database.
