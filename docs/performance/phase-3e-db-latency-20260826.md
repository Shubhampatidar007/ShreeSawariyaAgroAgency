# Phase 3E — Supabase query latency measurement

**Measured:** 2026-08-26 08:37 UTC  
**Project:** `cmfqlpcrnkswgxrszoog` (Shree Sawariya Agro Agency)  
**Database:** PostgreSQL 17.6, `ap-south-1`

## Scope

Phase 3E added five targeted indexes only:

- `customers(user_id)`
- `customer_transactions(customer_id, entry_date DESC)`
- `supplier_transactions(supplier_id, entry_date DESC)`
- `orders(customer_id, placed_on DESC)`
- `order_items(order_id)`

No application code, routes, stores, business logic, RLS policies, triggers, Edge Functions, or user flows were changed.

## Live database size at measurement

- customers: 12 rows
- customer_transactions: 41 rows
- suppliers: 7 rows
- supplier_transactions: 19 rows
- orders: 3 rows
- order_items: 4 rows

## After-change measurements

All measurements used `EXPLAIN (ANALYZE, BUFFERS)` against representative query shapes used by the application.

| Query path | Execution time | Planner path | Shared hits |
| --- | ---: | --- | ---: |
| Customer Khata: filter by `customer_id`, order by `entry_date DESC` | 0.170 ms | Seq Scan + Sort | 4 |
| Supplier ledger: filter by `supplier_id`, order by `entry_date DESC` | 0.153 ms | Seq Scan + Sort | 4 |
| Customer orders: filter by `customer_id`, order by `placed_on DESC` | 0.188 ms | Seq Scan + Sort | 4 |
| Order items: filter by `order_id` | 0.113 ms | Seq Scan | 1 |
| Customer/RLS lookup shape: `user_id IS NOT NULL`, ordered `id`, limit 1 | 0.027 ms | Seq Scan + Sort | 1 |

## Interpretation

The indexes are successfully applied and present in `pg_stat_user_indexes`. Their current `idx_scan` values are zero immediately after creation.

That is expected for the current dataset size: PostgreSQL estimates a sequential scan to be cheaper than an index lookup when each affected table contains only a few rows. This measurement therefore does **not** claim a measurable latency improvement at the current scale.

The indexes remain valuable for the existing filter/order paths as the tables grow. The correct follow-up is to re-measure at a larger production row count or when `pg_stat_user_indexes.idx_scan` begins to show real usage, rather than forcing index scans on the current tiny tables.

## Baseline comparison note

A trustworthy pre-index wall-clock measurement was not captured before Phase 3E, so no fabricated before/after percentage is reported here. The earlier repo state was inspected for query shapes, and the live post-change timings above are the authoritative Phase 3E measurement.

## Supabase performance advisor

The live performance advisor still reports other existing issues, including unindexed foreign keys on several tables and RLS initialization-plan warnings. Those were **not** changed in this phase because they are separate performance changes requiring their own dependency/RLS review and isolated commit.

## Verification

- Migration applied successfully to the live Supabase project.
- All five Phase 3E indexes confirmed in `pg_stat_user_indexes`.
- Representative query latency captured with `EXPLAIN (ANALYZE, BUFFERS)`.
- No application files changed by this measurement commit.
- Existing Phase 3E migration remains the only schema change in the phase.
