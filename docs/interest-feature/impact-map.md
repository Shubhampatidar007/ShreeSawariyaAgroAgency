# Impact Map — Product Sales Lookup & Customer Interest Management

**Branch:** `feat/interest-management`
**Author:** Z.ai assistant
**Date:** 2026-10-13
**Status:** Draft — awaiting approval before any code or migration is written

This document is the Phase 0 deliverable required by the spec ("Begin by inspecting the current schema and the complete New Khata Sale save flow. Produce a concise impact map, implement in small reviewable steps, and preserve existing behavior").

---

## 1. Current state of the codebase

### 1.1 Stack

- **Framework:** React + Vite + TypeScript (TanStack Router, TanStack Query, shadcn/ui)
- **DB:** Supabase (Postgres + RLS + RPC functions + Edge Functions)
- **No ORM** — direct `supabase-js` client. Prisma is NOT used (the `prisma/` dir present in the sandbox starter is unrelated).
- **No test framework installed** — no vitest, jest, or playwright. Phase 6 will require setting up test infrastructure from scratch (see §7).

### 1.2 Relevant existing tables (from `supabase/migrations/`)

| Table | Purpose | RLS |
|---|---|---|
| `customers` | Customer master + denormalized balance (`total_purchases`, `total_paid`, `current_due`, `credit_balance`, `last_purchase`) | staff all + own read |
| `customer_transactions` | One row = one sale (`entry_type='purchase'/'sale'`) OR one payment OR one credit/adjustment/return. Has `product` summary, `quantity`, `amount`, `payment`, `remaining_due`, `method`, `order_id`. | staff all + own read |
| `customer_transaction_items` | One row per line item. `amount` is a GENERATED column (`quantity * rate`). Has `product_id`, `product_variant_id`, `purchase_cost`, `admin_price_inc`. | staff all + own read |
| `payments` | Cross-cutting payments ledger (incoming/outgoing, party_id, party_name, order_code, reference) | staff all |
| `suppliers`, `supplier_transactions` | Mirror of customers for suppliers | staff all |
| `inventory_items`, `products`, `product_variants` | Stock + storefront catalog | staff all + public read for published products |
| `orders`, `order_items` | Storefront orders (separate flow from Khata) | staff all + own read |
| `reminders`, `reminder_logs`, `notifications` | Existing reminder infrastructure (already used by the low-stock popup) | staff all |
| `activity_logs` | Audit log — `actor`, `action`, `entity`, `entity_id`, `detail` | staff all |

### 1.3 Existing financial RPC functions (Postgres, SECURITY DEFINER)

All require `public.is_staff(auth.uid())`. All revoke access from anon/public. The user has been incrementally hardening these.

| Function | Purpose | Latest version |
|---|---|---|
| `create_khata_sale` | Original multi-item sale (used internally as a fallback) | `20260810120000_khata_multi_item_sales.sql` |
| `create_khata_sale_with_bargaining` | **Current sale RPC** used by the UI. Adds bargaining discount, resolves product/variant identity, creates custom-item hidden draft products, normalizes loose-sale COGS. | `20261002150000_fix_khata_loose_sale_purchase_cost.sql` |
| `record_khata_payment` | Records a customer payment against outstanding due | `20260810120000_khata_multi_item_sales.sql` |
| `record_customer_product_return` | Khata return (re-adds stock, reduces due) | (in migrations, not redefined) |
| `record_supplier_payment` | Supplier payment | `20260810220000_record_supplier_payment.sql` |
| `record_inventory_lot_purchase` | Supplier purchase (inventory lot) | (in migrations) |
| `recalc_customer_balance(_customer_id)` | Recomputes denormalized `total_purchases`, `total_paid`, `current_due`, `credit_balance`, `last_purchase` | base migration |
| `customer_tx_after()` trigger | On every `customer_transactions` INSERT/UPDATE/DELETE: calls `recalc_customer_balance`, updates `remaining_due` on the row, inserts a `payments` row if `payment > 0` | base migration |

### 1.4 Critical triggers that fire on financial writes

1. `t_customer_tx` AFTER INSERT/UPDATE/DELETE on `customer_transactions` → `customer_tx_after()` → recalcs balances + inserts `payments` rows + updates `remaining_due`.
2. `t_inventory_stock_watch` AFTER UPDATE on `inventory_items` → fires low-stock reminders.
3. `t_order_item` AFTER INSERT on `order_items` → decrements inventory.
4. `t_order_insert` AFTER INSERT on `orders` → creates a `customer_transactions` row for storefront orders.

**Implication for interest feature:** Any new ledger event we insert into `customer_transactions` will trigger `customer_tx_after()`. This is desirable (we want balances to reconcile) but we must make sure interest-bearing sale rows do NOT double-count in `recalc_customer_balance`. See §4.3 for the design that avoids this.

### 1.5 The current Khata sale save flow (Phase 2 must extend this)

```
src/components/khata/KhataSaleDialog.tsx  (1762 lines)
  ↓ user clicks Save
  ↓ STEP 1: optionally create new customer (supabase insert)
  ↓ STEP 2: shopStore.createKhataSale({ customerId, items, paid, bargainingAmount, method, date, reference, remarks })
  ↓        → src/lib/shop-store.ts:549
  ↓        → supabase.rpc("create_khata_sale_with_bargaining", { _customer_id, _items, _paid, _bargaining_amount, _method, _entry_date, _remarks })
  ↓        → Postgres fn validates + inserts customer_transactions row + inserts customer_transaction_items rows + decrements inventory
  ↓        → t_customer_tx trigger fires → recalc_customer_balance + payments row
  ↓ STEP 3: shopStore.fetchTransactionItems(txId) — reloads authoritative line items for receipt
  ↓ STEP 4: WhatsApp receipt Edge Function (skippable via receiptOption="none")
```

**Phase 2 design constraint:** The interest agreement must be saved in the SAME atomic RPC call that saves the sale, OR in a separate RPC called immediately after with the returned `tx_id`. Adding it as a parameter to `create_khata_sale_with_bargaining` is the cleanest path (see §4.2).

### 1.6 The current customer Khata page (Phase 3 must extend this)

```
src/routes/admin.khata.customers.$customerId.tsx (293 lines)
  - loads paginated customer_transactions via loadCustomerKhataPage (src/lib/admin-customer-data.ts)
  - renders SummaryCards (Total purchase, Total paid, Current due, Transactions)
  - tabs: List view (table on desktop, cards on mobile) + Timeline
  - actions: Record payment, Return product, New sale, Print, Export

src/routes/admin.customers.$customerId.index.tsx (348 lines)
  - loads full ledger via loadCustomerLedger + loadCustomerProfitData
  - renders SummaryCards + Personal information card + Transaction timeline
  - timeline groups by date, expands in place to show line items fetched via shopStore.fetchTransactionItems
```

**Phase 3 design constraint:** The Khata page reads from `customer_transactions` only. Interest agreements will live in separate tables (see §4.1) and be displayed as a separate "Interest agreements" section ABOVE or BESIDE the existing transaction list. The existing list MUST NOT change shape — `recalc_customer_balance` continues to read `customer_transactions` rows.

### 1.7 Existing admin navigation (Phase 4 must extend this)

`src/data/navigation.ts` — two groups: primary (Overview, Customers, Suppliers, Inventory, Products, Orders & Sales, Payments, Reports, Analytics, Testimonials) and secondary (Reminders, Inventory Reminders, Backups, Search).

**Phase 4 will add:** "Interest Management" entry in the secondary group, between Reminders and Inventory Reminders.

---

## 2. What the new feature must NOT break (preserve list)

The spec says "preserve existing behavior" repeatedly. The following must work identically before and after this feature ships:

1. **A Khata sale WITHOUT interest enabled** — same RPC signature (or compatible extension), same DB rows, same receipt, same balance calculation.
2. **Khata returns** — `record_customer_product_return` continues to work; interest-bearing sales that are returned must refund principal correctly (interest waiver for the returned portion — see §4.5).
3. **Khata payments without an interest agreement** — `record_khata_payment` continues to behave exactly as today.
4. **Storefront orders** — `t_order_insert` trigger continues to create `customer_transactions` rows. These never have interest.
5. **Inventory and stock counts** — unaffected. Direct loans do not touch inventory.
6. **Sales revenue / reports / dashboard** — unaffected. Direct loans are not sales. Interest is not revenue until paid (accrual accounting is separate).
7. **WhatsApp receipts** — existing receipt flow unchanged. A new "interest agreement" receipt may be added but is optional.
8. **Customer balance reconciliation** — `recalc_customer_balance` continues to be the single source of truth for the denormalized `customers.current_due`.
9. **RLS** — all existing policies continue to gate access. New tables get their own policies.
10. **Mobile / PWA layout** — all existing UI compaction work from previous PRs remains.

---

## 3. Conceptual model chosen (defaults — correct me if wrong)

### 3.1 Interest model

- **Daily simple interest**: `interest = principal × annualRate × daysElapsed / 365`
- **Payments allocate interest-first, then principal** (standard loan convention)
- **No interest-on-interest** (simple interest, not compound). Accrued but unpaid interest does NOT itself accrue interest.
- **Rate period is configurable per agreement** — admin picks monthly OR annual rate. Monthly rate is converted to annual internally: `annualRate = monthlyRate × 12`. The displayed rate is what the admin entered.
- **Day count convention**: ACT/365 (actual days, 365-day year). Simplest and most defensible for an Indian agro shop.
- **Partial period**: fractional days count fractionally. No "first month free" or "month-end rounding" rules.

### 3.2 Direct loans vs. sale-backed interest agreements

- A **sale-backed interest agreement** is attached to an existing `customer_transactions` row of `entry_type='purchase'/'sale'`. The principal is `amount - payment` (the outstanding sale due at agreement start).
- A **direct loan** has NO underlying sale. It lives in its own `loans` table. The principal is the disbursed amount. Disbursement creates a `customer_transactions` row of a new `entry_type='loan_disbursement'` so it appears in the customer ledger.

### 3.3 Idempotency

Every financial RPC accepts an optional `_idempotency_key text` parameter. We store the hash in a new `idempotency_log` table; duplicate submissions within a 24h window return the original result instead of creating new rows.

---

## 4. Planned schema additions (Phase 5)

### 4.1 New tables

All NEW tables — no modifications to existing tables except adding nullable FK columns where needed. All have RLS, all grants match existing patterns.

```sql
-- One row per interest-bearing agreement (sale-backed OR direct loan)
CREATE TABLE public.interest_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  -- What kind of agreement: 'sale' = attached to a customer_transactions row,
  -- 'loan' = direct loan, no underlying sale.
  agreement_type text NOT NULL CHECK (agreement_type IN ('sale', 'loan')),

  -- For sale-backed: the underlying sale. For loan: NULL.
  source_transaction_id uuid REFERENCES public.customer_transactions(id) ON DELETE SET NULL,

  -- For loan: the loan record. For sale: NULL.
  loan_id uuid REFERENCES public.loans(id) ON DELETE SET NULL,

  -- Original principal at agreement start (sale: amount - payment; loan: disbursed amount)
  original_principal numeric(14,2) NOT NULL CHECK (original_principal >= 0),

  -- Current outstanding principal (decreases as principal payments are recorded)
  outstanding_principal numeric(14,2) NOT NULL CHECK (outstanding_principal >= 0),

  -- Interest rate as a percentage. rate_period determines whether this is monthly or annual.
  interest_rate numeric(8,4) NOT NULL CHECK (interest_rate >= 0),
  rate_period text NOT NULL DEFAULT 'annual' CHECK (rate_period IN ('monthly', 'annual')),

  -- When interest starts accruing
  interest_start_date date NOT NULL DEFAULT current_date,

  -- Method: only 'simple' supported initially. Column exists so we can add 'compound' later without schema change.
  method text NOT NULL DEFAULT 'simple' CHECK (method IN ('simple')),

  -- Status: 'active' | 'paused' | 'settled' | 'closed'
  -- 'paused' = interest accrual paused (e.g. dispute). 'settled' = paid in full. 'closed' = admin closed (with reason).
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'settled', 'closed')),

  notes text,
  terms_confirmed boolean NOT NULL DEFAULT false,

  -- Idempotency
  idempotency_key text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  closed_reason text
);

-- Rate history (one row per rate revision; the interest_agreements.interest_rate is always the CURRENT rate)
CREATE TABLE public.interest_agreement_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.interest_agreements(id) ON DELETE CASCADE,
  interest_rate numeric(8,4) NOT NULL CHECK (interest_rate >= 0),
  rate_period text NOT NULL CHECK (rate_period IN ('monthly', 'annual')),
  effective_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Direct loans (separate from sales — never touches inventory or sales revenue)
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  principal_disbursed numeric(14,2) NOT NULL CHECK (principal_disbursed > 0),
  disbursement_date date NOT NULL DEFAULT current_date,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_reference text,
  notes text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Payment allocations (one row per payment, splits amount across interest/principal/adjustment)
CREATE TABLE public.interest_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.interest_agreements(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT current_date,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  interest_portion numeric(14,2) NOT NULL DEFAULT 0 CHECK (interest_portion >= 0),
  principal_portion numeric(14,2) NOT NULL DEFAULT 0 CHECK (principal_portion >= 0),
  adjustment_portion numeric(14,2) NOT NULL DEFAULT 0,  -- can be negative for waivers
  method text NOT NULL DEFAULT 'cash',
  reference text,
  notes text,
  -- Links back to the customer_transactions payment row (if one was created)
  ledger_transaction_id uuid REFERENCES public.customer_transactions(id) ON DELETE SET NULL,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Adjustments (waivers, negotiated settlements, rate-change financial impact)
CREATE TABLE public.interest_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.interest_agreements(id) ON DELETE CASCADE,
  adjustment_date date NOT NULL DEFAULT current_date,
  -- 'waiver' = reduce interest owed; 'write_off' = reduce principal; 'rate_change' = metadata only (rate stored in rate_history)
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('waiver', 'write_off', 'rate_change', 'other')),
  interest_delta numeric(14,2) NOT NULL DEFAULT 0,
  principal_delta numeric(14,2) NOT NULL DEFAULT 0,
  reason text NOT NULL,
  approved_by uuid REFERENCES auth.users(id),
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotency log (24h TTL)
CREATE TABLE public.idempotency_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  operation text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.2 New RPC functions (all SECURITY DEFINER, all require `is_staff`)

| Function | Purpose | Phase |
|---|---|---|
| `create_khata_sale_with_interest(_customer_id, _items, _paid, _bargaining_amount, _method, _entry_date, _remarks, _interest_settings jsonb, _idempotency_key text)` | Atomic sale + interest agreement. Calls existing `create_khata_sale_with_bargaining` internally, then creates the `interest_agreements` row. If `_interest_settings` is NULL, behaves identically to the existing function (Phase 2 requirement #1). | 2 |
| `accrue_interest_to_date(_agreement_id uuid, _as_of date)` | Pure function. Returns `{ accrued_interest, interest_paid, interest_outstanding, principal_outstanding, total_settlement }` as of the given date. Does NOT write to DB. Used by previews and by settlement. | 2 |
| `record_interest_payment(_agreement_id, _amount, _method, _entry_date, _allocation jsonb, _reference, _notes, _idempotency_key)` | Records a payment against an agreement. Allocates per `_allocation` (auto if NULL: interest-first). Inserts a `customer_transactions` payment row + `interest_payments` row atomically. | 3 |
| `revise_interest_rate(_agreement_id, _new_rate, _new_rate_period, _effective_date, _reason, _idempotency_key)` | Adds a row to `interest_agreement_rate_history` and updates `interest_agreements.interest_rate`. Prior periods are unaffected (they use the rate that was in effect at the time — see §4.4). | 3 |
| `record_interest_adjustment(_agreement_id, _adjustment_type, _interest_delta, _principal_delta, _reason, _idempotency_key)` | Records a waiver / write-off / other adjustment. | 3 |
| `settle_interest_agreement(_agreement_id, _settlement_date, _idempotency_key)` | Closes the agreement IF AND ONLY IF outstanding principal + outstanding interest = 0 (after applying any final settlement payment). Otherwise raises an exception. | 3 |
| `create_direct_loan(_customer_id, _principal, _disbursement_date, _interest_rate, _rate_period, _payment_method, _payment_reference, _notes, _interest_start_date, _idempotency_key)` | Atomic: creates `loans` row + `interest_agreements` row (type='loan') + `customer_transactions` row (entry_type='loan_disbursement'). Does NOT touch inventory, products, or sales totals. | 4 |
| `search_product_sales(_product text, _date_from date, _date_to date, _rate numeric, _quantity numeric, _page int, _page_size int, _sort_by text, _sort_dir text)` | Returns paginated join of `customer_transaction_items` → `customer_transactions` → `customers`. Used by Phase 1. | 1 |
| `aggregate_most_sold_products(_date_from date, _date_to date)` | Returns top products by total quantity and amount for the period. | 1 |

### 4.3 How balances reconcile with `recalc_customer_balance`

The existing `recalc_customer_balance` function sums `amount` and `payment` from `customer_transactions` rows. **We must NOT break this.**

Design rules:
- **Sale-backed interest agreement** does NOT create a new `customer_transactions` row. It only attaches to the existing sale row via `source_transaction_id`. The customer's `current_due` continues to equal `SUM(amount) - SUM(payment)` from `customer_transactions`.
- **Direct loan disbursement** DOES create a `customer_transactions` row with `entry_type='loan_disbursement'`, `amount=principal`, `payment=0`. This means `current_due` will include the loan principal — which is correct: the customer owes us that money.
- **Interest payments** create a `customer_transactions` row with `entry_type='payment'`, `payment=amount`. This reduces `current_due` — correct.
- **Accrued interest** is NOT added to `customer_transactions` until it is actually paid. The customer's `current_due` therefore shows principal-only. The interest agreement's `accrue_interest_to_date` function is used separately to show "total settlement amount" in the UI.

**This means the dashboard `current_due` always equals principal owed. The Khata page shows interest separately as "accrued interest, payable on settlement."** This is the conservative, audit-friendly choice and is consistent with the spec's "Do not overwrite sale amounts, historical rates, or customer balances to implement interest."

### 4.4 Rate-change boundary handling

When the admin revises the rate effective date D, all interest accrued BEFORE D uses the old rate; all interest accrued from D onward uses the new rate. Implementation:

```sql
-- Inside accrue_interest_to_date():
-- Walk through interest_agreement_rate_history ordered by effective_date.
-- For each segment [effective_date, next_effective_date), compute:
--   segment_interest = outstanding_principal_at_segment_start × annual_rate × segment_days / 365
-- Where outstanding_principal_at_segment_start is the principal remaining after all payments
-- up to that date. This is the "rate segments with payment-aware principal" approach.
```

### 4.5 Returns on interest-bearing sales

When a Khata return happens on a sale that has an interest agreement:
- `record_customer_product_return` continues to work as today (reduces inventory, reduces `amount` on the sale row, fires `recalc_customer_balance`).
- A new trigger fires AFTER the return to also reduce the agreement's `outstanding_principal` by the returned principal amount AND record an `interest_adjustments` row of type 'waiver' for the interest that would have accrued on the returned portion. This keeps the interest system honest.

This is the trickiest part of the design and will get extra test coverage (Phase 6 scenario 8).

### 4.6 RLS policies on new tables

Same pattern as existing tables:
- `interest_agreements` — staff all + customer own read (via `customer_id` → `customers.user_id`)
- `loans` — staff all + customer own read
- `interest_payments`, `interest_adjustments`, `interest_agreement_rate_history` — staff all
- `idempotency_log` — service_role only (no authenticated access; RPC functions write to it)

---

## 5. UI changes (Phases 1–4)

### 5.1 Phase 1: Product Sales History page

- New route: `/admin/product-sales` (file: `src/routes/admin.product-sales.tsx`)
- Nav entry in `src/data/navigation.ts`: secondary group, "Product Sales"
- Filters: product search, date from/to, optional rate, optional quantity
- Results table: customer name, mobile, village, date, product, quantity, unit, rate, line amount, transaction total, payment, outstanding due, transaction reference, "View Khata" link to `/admin/khata/customers/$customerId`
- Pagination: 25 per page
- Sorting: by date, amount, customer name
- Export: CSV (client-side, generated from filtered result set)
- "Most Sold Products" summary card above results: top 5 products by quantity and amount in the period
- Mobile: card list layout (same pattern as the recent Khata UI compaction)

### 5.2 Phase 2: Interest Settings in Khata Sale Dialog

- New collapsed-by-default section in `KhataSaleDialog.tsx` labeled "Interest Settings"
- Toggle: "Charge interest on outstanding balance"
- When enabled, shows:
  - Interest start date (defaults to today, editable)
  - Rate (%) + period (Monthly / Annually radio)
  - Eligible principal (defaults to `finalTotal - paidNum`; editable down)
  - Live preview: "Accrued interest after 30/60/90 days: ₹X / ₹Y / ₹Z"
  - Agreement notes (textarea)
  - "I confirm the customer has agreed to these terms" checkbox (required to save)
- Save: calls `create_khata_sale_with_interest` with `_interest_settings` JSON. If toggle off, passes NULL and behavior is identical to today.
- The existing WhatsApp receipt text is extended with an optional "Interest: X% per annum starting DD-MM-YYYY" line — only when interest is enabled.

### 5.3 Phase 3: Khata page interest panel

- New "Interest Agreements" card on `/admin/khata/customers/$customerId`, placed between the SummaryCards and the Tabs.
- For each active agreement on this customer, show:
  - Type (Sale / Loan)
  - Principal (original + current outstanding)
  - Rate + period
  - Start date
  - Accrued interest (live, as of today)
  - Interest paid, principal paid
  - Total settlement amount
  - Status badge
- Actions per agreement:
  - "Record payment" — opens a payment dialog with allocation (auto interest-first, or manual split)
  - "Revise rate" — opens a dialog with new rate + effective date + reason
  - "Waiver / Adjustment" — opens a dialog to record an approved waiver
  - "Settle & close" — calls `settle_interest_agreement`; only succeeds if balance is zero

### 5.4 Phase 4: Interest Management page

- New route: `/admin/interest-management` (file: `src/routes/admin.interest-management.tsx`)
- Nav entry in `src/data/navigation.ts`: secondary group, between Reminders and Inventory Reminders
- Two tabs:
  - **Active Agreements**: filterable list (search by customer, village filter, date filter). Columns: customer, type, principal, accrued interest, total outstanding, rate, start date, status. Click row → `/admin/khata/customers/$customerId`
  - **Give Money / Direct Loan**: form to select or create a customer, enter principal, disbursement date, interest start date, rate, period, payment method, reference, notes. Submit calls `create_direct_loan`.

---

## 6. Phase ordering and PR plan

| PR | Branch from | Branch | Contents | Estimated diff |
|---|---|---|---|---|
| PR-1 | `main` | `feat/interest-schema` | All Phase 5 migrations + RPC functions. No UI. Tests for `accrue_interest_to_date`. | ~600 lines SQL |
| PR-2 | `feat/interest-schema` | `feat/product-sales-history` | Phase 1: page + RPC `search_product_sales` + nav + export. | ~500 lines TS/TSX |
| PR-3 | `feat/product-sales-history` | `feat/khata-sale-interest` | Phase 2: extend `KhataSaleDialog.tsx` + new RPC `create_khata_sale_with_interest`. | ~400 lines TS/TSX + ~150 SQL |
| PR-4 | `feat/khata-sale-interest` | `feat/khata-interest-panel` | Phase 3: Khata page interest panel + 4 action dialogs. | ~600 lines TSX |
| PR-5 | `feat/khata-interest-panel` | `feat/interest-management-page` | Phase 4: central Interest Management page + nav. | ~500 lines TSX |
| PR-6 | `feat/interest-management-page` | `feat/interest-tests` | Phase 6: vitest setup + tests for the 13 scenarios. | ~800 lines TS |
| PR-7 | `feat/interest-tests` | `feat/interest-release` | Phase 7: final verification, type check, lint, build. Implementation report. | ~100 lines docs |

Each PR is reviewable in under an hour. Each builds on the previous. You can stop at any point and the codebase is shippable.

---

## 7. Phase 6 testing infrastructure

**Current state:** no test framework installed. Phase 6 will require:

1. Install `vitest` + `@vitest/coverage-v8` + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom` + `@playwright/test` (optional, for E2E).
2. Add `vitest.config.ts` (extends vite config).
3. Add `tests/` directory with:
   - `tests/db/` — Postgres function tests (using `supabase test` or a dockerized Postgres + pgTAP)
   - `tests/unit/` — pure function tests (interest accrual calc, allocation logic)
   - `tests/integration/` — RPC round-trip tests against a test Supabase project
   - `tests/ui/` — component tests for the new dialogs

**Risk:** the test setup alone is a 200-line config effort. We may need a separate `chore/test-infrastructure` PR before PR-6.

---

## 8. Risk register

| # | Risk | Mitigation |
|---|---|---|
| R1 | `recalc_customer_balance` doubles counts interest payments | Interest payments create `customer_transactions` rows with `entry_type='payment'` only. The agreement's `interest_payments` table is a SEPARATE ledger. The customer_transactions row is the customer-facing ledger; the interest_payments row is the agreement-internal detail. |
| R2 | Trigger `t_customer_tx` fires on the loan_disbursement row and recalcs balance — desired, but we must make sure no infinite loop | The trigger fires once per `customer_transactions` row; our RPC inserts exactly one row. No loop. |
| R3 | Rate change applied retroactively instead of prospectively | Rate segments are walked in `accrue_interest_to_date` using `interest_agreement_rate_history.effective_date`. Each segment uses its own rate. Tested in Phase 6 scenario 5. |
| R4 | Backdated payment creates negative interest | Validate in `record_interest_payment` that `_entry_date >= interest_start_date`. Backdated payments below the start date are rejected. Backdated payments within the agreement period recalculate the accrued interest up to that date and allocate interest-first. |
| R5 | Duplicate submission creates double entries | `_idempotency_key` parameter + `idempotency_log` table. RPC checks for existing key within 24h window before executing. |
| R6 | Customer returns a product on an interest-bearing sale, interest keeps accruing on the returned principal | Trigger on `customer_transactions` UPDATE (when entry_type='return') reduces `interest_agreements.outstanding_principal` and records an `interest_adjustments` row. |
| R7 | Test framework setup blocks Phase 6 | Split into `chore/test-infrastructure` PR done before PR-6. |
| R8 | Migration runs on prod without testing | I write migrations only; you run `supabase db push` against dev first. Documented in PR-1 description. |
| R9 | Edge function for WhatsApp receipt not updated for interest | Phase 2 includes a small text change to the existing Edge Function. Verified manually. |
| R10 | Type drift between RPC jsonb inputs and TypeScript types | Generate types from Supabase after schema is applied (`supabase gen types typescript`). Update `src/types/business.ts` and `src/integrations/supabase/types.ts`. |
| R11 | Mobile UI for new Interest Management page overflows on PWA | Follow the same compact-card pattern used in the recent Khata UI compaction work. Tested on 360px viewport. |
| R12 | Direct loans accidentally inflate sales revenue | `loans` table is separate. `customer_transactions.entry_type='loan_disbursement'` is excluded from the sales-revenue aggregation function (`business_stats`). New migration adds a WHERE clause to the relevant view. |

---

## 9. What I will NOT do unless explicitly asked

- Compound interest (spec says simple only; "Do not apply interest to interest unless a separately supported and explicitly approved policy requires it")
- Auto-charge interest to the customer balance (interest is shown as "accrued, payable on settlement" — never auto-added to `current_due`)
- Rewrite the customer ledger (spec: "Do not replace the customer ledger or rewrite the current sale system unnecessarily")
- Auto-apply migrations to any database (I write SQL, you run it)
- Force a test framework choice on you (vitest is my default; tell me if you want jest or playwright-only)

---

## 10. Questions to confirm before implementation begins

These are the same questions I batched earlier. If you re-send the spec without answering, I will proceed with the bracketed defaults. Please correct any that are wrong.

1. Delivery: [MVP-first, phased PRs as described in §6]
2. Branching: [stacked sub-branches as described in §6]
3. Migrations: [I write, you apply to your dev DB]
4. Testing depth: [critical-path tests for the 13 Phase 6 scenarios]
5. First deliverable this session: [this impact map only — no code yet]
6. Interest model: [daily simple interest, ACT/365, interest-first allocation, no compounding]
7. Direct loans appearance: [separate `loans` table + `customer_transactions` row tagged `entry_type='loan_disbursement'`]
8. Test framework: [vitest for unit/integration, manual for E2E]
9. Idempotency: [yes, via `_idempotency_key` parameter + `idempotency_log` table, 24h TTL]
10. Rate-change semantics: [prospective only — old rate applies up to effective_date, new rate from effective_date onward]

---

## 11. Approval gate

**This document is the ONLY artifact on the `feat/interest-management` branch.** No code, no migrations, no UI changes have been written.

Before I begin Phase 5 (schema + RPC functions), please confirm:

- [ ] Section 3 (conceptual model) — agree with daily simple interest, interest-first allocation, no compounding?
- [ ] Section 4 (schema) — agree with the 6 new tables and 8 new RPC functions?
- [ ] Section 5 (UI plan) — agree with the new routes and navigation placement?
- [ ] Section 6 (PR plan) — agree with 7 stacked PRs?
- [ ] Section 10 (defaults) — any defaults you want to override?

Once you reply with approval (or corrections), I'll start PR-1 (`feat/interest-schema`).
