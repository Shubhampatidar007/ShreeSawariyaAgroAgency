# Phase 3 — Database Work Audit

Date: 2026-08-26
Branch: `fix/lagging-issue-26-08`

## Implemented

- Replaced wildcard `select("*")` calls in the route-scoped admin loader with explicit column lists matching each mapper/UI dependency.
- Limited the notification feed to 50 rows.
- Limited inventory-target reminder data used by the shell warning flow to 100 rows.
- Limited reminder history/logs to 500 rows, advertisements to 500 rows, and backups to 100 rows because those screens do not need unbounded history for their initial view.
- The overview order query now requests only the order fields needed for dashboard calculations plus the required order-item fields; it no longer fetches the complete `orders.*` payload.
- Order, customer transaction, supplier transaction, product, variant, inventory, payment, CMS, ad, backup and reminder projections were narrowed to the fields consumed by their existing mappers.

## Pagination decision

The current production tables are small: approximately 39 customer transactions, 25 payments, 24 reminder logs, 19 supplier transactions, 12 inventory items, 11 customers, 7 suppliers, 4 order items and 3 orders. Existing admin table pagination is client-side and expects the complete collection in the shared store. Introducing server-side pagination now would change the existing data contract and require route-specific page/filter/count plumbing. It is therefore intentionally deferred until a table becomes materially large or server pagination is required for a concrete screen.

## Dashboard aggregation decision

No new Supabase RPC/database function was introduced in this phase. The overview profit history currently depends on order-item and ledger detail, so replacing those records with a compact aggregate contract would require a coordinated dashboard/RPC design and a Supabase schema change. With the current dataset size, that change would add risk without a measurable database benefit. It should be revisited after production data volume grows or the dashboard becomes a measured bottleneck.

## Index review

Reviewed public indexes and representative query plans. The current database has primary/unique indexes plus targeted indexes for OTPs, product variants, transaction items and reminders. The most relevant order-by queries currently execute well below 1 ms on the live dataset; therefore no new index was added in this phase. Adding many order/date/name indexes to tables with only a handful of rows would add write/storage overhead without a meaningful current gain.

## Query timing checkpoints

Representative live PostgreSQL timings:

- `orders` with wildcard projection + sort: ~0.161 ms execution time.
- `orders` with the narrowed `id, placed_on, total, paid` projection + sort: ~0.133 ms execution time.
- Narrowed overview-style order projection including selected order-item fields: ~0.381 ms execution time on the current 3-order dataset.

These are database execution times only; they do not include browser, Supabase HTTP/TLS, serialization, React rendering, or laptop/DevTools overhead.

## Supabase safety

No table, column, RLS policy, trigger, RPC/function, storage object, or data was changed by Phase 3. This phase only changed which columns the existing application requests and added bounded reads for datasets where unbounded history is not required for the initial screen.
