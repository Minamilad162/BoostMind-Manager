# Invoice Studio — v1.2.0 implementation, source mapping and QA

Source: user-provided `BoostMind-OS-v0.11.22.zip` (`src/components/InvoiceStudio.tsx`, `src/lib/etaInvoiceImport.ts`, `docs/current/INVOICE_STUDIO.md`). Used as a **reference** only, not a runtime dependency or importable database.

## Mapping

| Old module | New BoostMind OS v1.2 |
| --- | --- |
| Organization billing profile | `invoice_billing_profiles` single-company profile |
| Invoice / lines / presentation | `invoices`, `invoice_lines`, `invoice_presentations.snapshot` JSONB |
| Work items | New `features` (belonging to selected project) |
| Client legal/tax fields | Additive fields on current `clients` + editor inputs |
| Client / project match | Direct new project `client_id` |
| Invoice print | Reused A4 document composition and BoostMind SVG logo |
| ETA XML / JSON import | Ported old parser, local-only processing, manual review |
| Invoice collections | New optional `payments.invoice_id` (never duplicates payment rows) |
| Authorization | Active Admin RLS + controlled security-definer RPCs |
| Invoice monetary totals | Derived from validated lines inside DB RPC, not the browser preview |

## Security review

- No direct authenticated insert/update/delete grants for invoice tables; admin-only SELECT RLS, controlled `save_invoice_document`, `issue_invoice_document`, `delete_invoice_document`, and `save_invoice_billing_profile` functions.
- Saving validates project-client relationship, lines, positive quantity, unit price, tax, currency, feature ownership and billing snapshot; pay links verify project, currency, remaining balance. DB locks invoice rows during allocation.
- Issued invoice editing is allowed only without linked payment history. Paid/Partial invoices cannot be edited or removed; issuing never adds a payment.
- Invoice actions are audited via existing admin-readable `audit_events`; old customer data/secrets are never referenced.
- Export uses browser print; legal/e-invoicing compliance requires separate independent validation.

## Staging checklist — NOT YET EXECUTED

1. Apply the new migration to a disposable database already at v1.1.3; confirm explicit grants/RLS and active vs inactive Admin vs Developer access.
2. Create billing profile; create invoice draft; change profile and verify old snapshot unaffected.
3. Import ETA JSON and XML, verify duplicate UUID rejection, invoice number collision guidance and conservative client match.
4. Save draft, issue, print A4 portrait (desktop and mobile), reopen and edit issued invoice before collection.
5. Record one partial collection, verify status/outstanding. Attempt invoice edit/delete (must fail). Record final collection, verify Paid and 0 outstanding.
6. Attempt over-allocation, wrong-project invoice selection, cross-currency link and concurrent payments (must fail/serialize).
7. Confirm accounting Dashboard, project Finance and founder 50/50 profit reflect **only payments** once, regardless of invoices.
8. Run Node tests, full TypeScript build, browser print and network/DB RLS tests before production.

## Change control

No migration to v0.11.22 database; no changes to old Supabase project, legacy role tables, ledger, old invoice numbering or original data. Only additive migration on v1.1.3 greenfield database.
