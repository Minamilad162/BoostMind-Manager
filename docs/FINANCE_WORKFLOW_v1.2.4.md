# BoostMind OS v1.2.4 — Flexible Project Shares / Collections / Expense Revisions

## Approved UX
- Project → Create/Edit: choose `Percentage` or `Manual amounts`.
- Percentage: enter Mina percentage between 0 and 100; Bishoy percentage is the remainder; amounts preview in contract's original currency.
- Manual: enter amount allocated to Mina and amount to Bishoy, **both in contract currency**. They **must add to contract** (e.g. EGP 70,000 = EGP 50,000 + EGP 20,000). Ratio for **realized net profit** derives from the manual split.
- 100%/0% and 0%/100% are valid. Existing projects keep 50%/50% until explicitly edited.
- The percentage allocation affects net project profit shares; personally paid expenses and reimbursement claims continue to be tracked *separately*.
- When an entitlement has already been paid, reducing its split below prior payouts is rejected by the DB. Do not silently rewrite historical money transactions.
- Receipts: Project Finance → `+ Payment` records each installment with original amount, USD/EGP equivalents, date, optional invoice, method, and `Received into` (Mina Milad Account / Bishoy Tamwil Account / Company Account / Other + custom receiver name). New payments require a receiver. Legacy receipts intentionally display `Receiver not recorded` rather than guessing one.
- Contract, Collected, Remaining shown together on Project details and Projects cards. Remaining in **native contract currency** is contract minus lifetime receipts; shown USD/EGP equivalent uses the *signed contract valuation*, so FX movement across collections cannot manufacture a negative outstanding figure. Actual receipt-day FX snapshots remain in Collected.
- Overcollection is blocked at DB level. Receipt insertion is append-only; the UI does not edit/delete historic receipts.
- Expenses: edit or delete planned/paid expenses from either Project Finance or Company Finance. The DB audit trail retains event and record identity; financial totals recalculate using current rows. The database forbids an expense change that would make prior founder profit payouts/reimbursements exceed entitlements.
- Period Dashboard/Finance profits are allocated per *transaction project*, not by dividing the overall company net 50/50. For differing project ratios, partners receive correct weighted totals in both currencies.
- Existing Invoice Studio is preserved: optional payment.invoice_id is an allocation, not a second money record.

## Server security
- Only active admin users may access project_financials/payments/expenses via existing RLS policies. New columns are inside admin-only project_financials table. No browser service-role key.
- New migration `202610280007_flexible_partner_shares_collections_edit_expenses.sql` adds DB checks, transaction guards and updates the `save_project` RPC; the old signature is removed.
- No existing data or organizations are imported. Back up before updating a database; apply migration only after existing 001–006.

## Manual validation on staging
1. Run `supabase/migrations/202610280007_flexible_partner_shares_collections_edit_expenses.sql` on **v1.2.3 staging**, then `supabase/VERIFY_v1.2.4_READ_ONLY.sql`.
2. Edit a project to EGP 70k, manual Mina 50k/Bishoy 20k; ensure both account for 100% and 0%/100% also work. 50k+18k must be rejected.
3. Record EGP 5k on 2026-10-10 to Mina Milad, then EGP 2k on 2026-10-15 to Company. Collected = EGP 7k, outstanding = EGP 63k for the 70k project. If contract=10k instead, outstanding = EGP 3k.
4. Change a paid expense from EGP 1k to EGP 1.5k and then delete it, verifying net changes and audit entries. Confirm non-admin cannot call direct expense UPDATE/DELETE.
5. Test invoice-linked receipt; status and balances update once. Reject collection beyond invoice or contract. Attempt overpaid payout after reducing Mina's share: must reject.
6. Regression: Resources, Saved Logins, Admin/Developer permissions, Invoice Studio, responsive menu.
7. `npm ci && npm run typecheck && npm test && npm run build` on a network-enabled CI environment, then browser end-to-end and live RLS checks. None of these server/browser checks are certified by local unit tests alone.
