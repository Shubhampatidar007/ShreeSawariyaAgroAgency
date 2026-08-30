-- Safe database hardening only.
-- No RPC EXECUTE changes, no RLS policy rewrites, and no table drops.

ALTER FUNCTION public.touch_checkout_otp_updated_at() SET search_path = public;
ALTER FUNCTION public.create_inventory_reminder() SET search_path = public;

CREATE INDEX IF NOT EXISTS idx_checkout_otp_verifications_order_id ON public.checkout_otp_verifications(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_transaction_items_product_id ON public.customer_transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_transaction_items_product_variant_id ON public.customer_transaction_items(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_variant_id ON public.inventory_items(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier_id ON public.inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_variant_id ON public.order_items(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_products_inventory_id ON public.products(inventory_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_inventory_item_id ON public.supplier_transactions(inventory_item_id);

-- Preserve existing policy semantics while allowing auth.uid() to be evaluated once per statement.
DROP POLICY IF EXISTS profiles_own_read ON public.profiles;
CREATE POLICY profiles_own_read ON public.profiles FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS user_roles_own_read ON public.user_roles;
CREATE POLICY user_roles_own_read ON public.user_roles FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS orders_own_read ON public.orders;
CREATE POLICY orders_own_read ON public.orders FOR SELECT TO authenticated USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS customer_transactions_own_read ON public.customer_transactions;
CREATE POLICY customer_transactions_own_read ON public.customer_transactions FOR SELECT TO authenticated USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS customer_transaction_items_own_read ON public.customer_transaction_items;
CREATE POLICY customer_transaction_items_own_read ON public.customer_transaction_items FOR SELECT TO authenticated USING (transaction_id IN (SELECT id FROM public.customer_transactions WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = (select auth.uid()))));

DROP POLICY IF EXISTS business_stats_staff_read ON public.business_stats;
CREATE POLICY business_stats_staff_read ON public.business_stats FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (select auth.uid()) AND ur.role IN ('admin','staff')));
