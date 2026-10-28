# Business rules and KPI registry — v1.0

## Source of truth

- Projects: `projects` (public fields) + `project_financials` (admin-only contract amount/currency).
- Project payment receipts: `payments` append-only via authenticated insert under admin RLS.
- Expenses: `expenses` with planned/paid status. Only `paid` rows have paid_at.
- Partner distributions: `distributions` immutable positive payout inserts; the DB trigger blocks payouts exceeding available credit.
- Task delivery status: `tasks.status` edited by admin; developer changes only via validated `update_my_task_status` RPC.
- Project access: project owner, explicit membership or individual assigned task. Backend RLS uses `private.can_access_project`.

## KPIs

| Label | Formula | Date rule | Security |
| --- | --- | --- | --- |
| Contracted value | SUM(project_financials.contract_amount) | projects.contract_date in FY | admin only |
| Collected revenue | SUM(payments.amount) | payments.paid_at in FY | admin only |
| Paid expenses | SUM(expenses.amount WHERE status='paid') | expenses.paid_at in FY | admin only |
| Net realized profit | Collected − paid expenses | Selected FY | admin only |
| Partner share | 0.5 × lifetime project net | project-level lifetime | admin only |
| Planned expenses | SUM(expenses.amount WHERE status='planned') | not included in cash net | admin only |
| Founder contributed expenses | SUM(paid expenses WHERE paid_by=founder) | lifetime | admin only |
| Founder profit balance | profit share − posted profit distributions | lifetime | admin only |
| Founder reimbursement balance | personal paid costs − reimbursement payouts | lifetime | admin only |
| Task progress | completed task count / project task count | all tasks, all dates | accessible users |

Currency isolation is mandatory; the FY selector is calendar-year by default (Jan-Dec). Never add USD and EGP values without a separately documented FX policy. Display project financial breakdown **lifetime-to-date** versus dashboard FY **period figures** with clear labels.

## Important accounting limitations

The balances are a management/cash-based profit dashboard, not statutory accrual accounting, tax reporting, payroll, or audited settlement accounts. If the business edits or reclassifies an already-paid expense after partner distributions, manual reconciliations may be necessary; do not treat these numbers as bank balances. Full journal-style immutable accounting will require a separate approved design before production accounting use.

## v1.1 Dual-currency reporting logic
- `contract_amount` and `currency` are the *original contracted amount and original currency*; `amount_usd` and `amount_egp` are user-confirmed snapshots of that SAME amount, not additional payments.
- All new receipts, expenses and payouts store original amount AND its USD/EGP equivalents in the transaction record. Contract-equivalent rates may be suggested in the UI but are never used to silently overwrite transactional snapshots.
- Period = calendar year, quarter or month, filtering by contract_date for contracted value, paid_at for receipt, and paid_at of status=paid expenses for costs.
- `Collected = SUM(payments.amount_usd/amount_egp)`; `Paid costs = SUM(paid expenses.amount_usd/amount_egp)`. Profit in each displayed currency = Collected minus Paid costs; founder economic profit shares = 50% of that net in EACH currency separately. Planned expenses and payouts are excluded from this profit calculation.
- The partner share can be negative in a loss period; it is the economic allocation, NOT money ready to withdraw. Profit payout limits remain enforced in ORIGINAL currency in the original migration; do not conflate share with bank withdrawals.
- Records without both equivalences do not enter converted totals. A missing-conversion count and warning is mandatory and figures cannot be described as complete until corrected.
- Filtering year options start in 2006; Q1 Jan–Mar, Q2 Apr–Jun, Q3 Jul–Sep, Q4 Oct–Dec. Month view chart groups days 1–7, 8–14, 15–21, 22–28, 29–end; no time-zone date shifting.
- Per-project financial table is lifetime and is labeled as such; the summary cards and the chart are period-based.
- No USD+EGP arithmetic across currencies; they are two valuations of the same transactions. Revaluation/FX gains/losses and tax accounting are explicitly outside this release.

## Project-scoped resource invariant — v1.1.3
- Every custom access entry references exactly one `projects.id` via `credential_records.project_id NOT NULL` FK. A global Saved Logins view is only a project-filtered view, not a company-wide unassigned record store.
- Every new resource form requires a selected project; if invoked from a project, it is preselected.
- `Other` saves a custom nonempty category alongside the user-entered label/title.
- Custom resource has URL and/or password. URL must be http(s). Passwords remain admin-readable plaintext under RLS, unchanged from v1.1.2.

## INV-1 — Invoice Studio authority (v1.2)
- Invoice amount source: sum of validated invoice line quantity × rate, plus manually entered nonnegative tax; computed by `save_invoice_document` in Postgres.
- Invoice is receivable, never a payment. Client collection uses `payments` only; optional `payments.invoice_id` is allocation metadata, never another transaction.
- Keep billing profile defaults separate from immutable invoice presentation snapshots unless explicitly edited.
- Edit issued/overdue invoice only before any linked payment history; paid/partial invoice locked.
- Link receipt only if project ID and invoice currency match project financial currency, total linked ≤ invoice total.
- ETA import is local prefill and requires human review; no claim of ETA approval or official issuance.
