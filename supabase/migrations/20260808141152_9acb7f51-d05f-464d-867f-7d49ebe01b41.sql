
REVOKE EXECUTE ON FUNCTION public.customer_tx_after() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.inventory_stock_watch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.order_item_after() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.order_after_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_customer_balance(uuid) FROM PUBLIC, anon, authenticated;
