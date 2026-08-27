begin;
alter table public.product_brand_rollback_20260827 enable row level security;
revoke all on table public.product_brand_rollback_20260827 from anon, authenticated;
commit;
