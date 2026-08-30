-- Safe database hardening only. Preserve all existing policy semantics.
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

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS orders_own_read ON public.orders;
CREATE POLICY orders_own_read ON public.orders FOR SELECT TO authenticated USING (customer_id IN (SELECT customers.id FROM public.customers WHERE customers.user_id = (select auth.uid())));

DROP POLICY IF EXISTS ctx_own_read ON public.customer_transactions;
CREATE POLICY ctx_own_read ON public.customer_transactions FOR SELECT TO authenticated USING (customer_id IN (SELECT customers.id FROM public.customers WHERE customers.user_id = (select auth.uid())));

DROP POLICY IF EXISTS cti_own_read ON public.customer_transaction_items;
CREATE POLICY cti_own_read ON public.customer_transaction_items FOR SELECT TO authenticated USING (transaction_id IN (SELECT ct.id FROM public.customer_transactions ct JOIN public.customers c ON c.id = ct.customer_id WHERE c.user_id = (select auth.uid())));
