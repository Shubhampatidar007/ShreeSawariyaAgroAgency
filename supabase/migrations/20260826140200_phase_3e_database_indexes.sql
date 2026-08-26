-- Phase 3E: targeted database indexes for repeated filtering and ordering paths.
-- Additive only: no existing tables, queries, policies, triggers, or business logic are changed.

create index if not exists idx_customers_user_id
  on public.customers (user_id);

create index if not exists idx_customer_transactions_customer_entry_date
  on public.customer_transactions (customer_id, entry_date desc);

create index if not exists idx_supplier_transactions_supplier_entry_date
  on public.supplier_transactions (supplier_id, entry_date desc);

create index if not exists idx_orders_customer_placed_on
  on public.orders (customer_id, placed_on desc);

create index if not exists idx_order_items_order_id
  on public.order_items (order_id);
