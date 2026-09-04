-- Prevent customer accounts from modifying or deleting customer/ledger/order history.
-- Customers retain SELECT access to their own records; staff retain full management access.

DROP POLICY IF EXISTS customers_staff ON public.customers;
DROP POLICY IF EXISTS customers_staff_manage ON public.customers;
CREATE POLICY customers_staff
ON public.customers
FOR SELECT
TO authenticated
USING ((SELECT private.is_staff()) OR (SELECT auth.uid()) = user_id);

CREATE POLICY customers_staff_manage
ON public.customers
FOR ALL
TO authenticated
USING ((SELECT private.is_staff()))
WITH CHECK ((SELECT private.is_staff()));

DROP POLICY IF EXISTS ctx_staff ON public.customer_transactions;
DROP POLICY IF EXISTS ctx_staff_manage ON public.customer_transactions;
DROP POLICY IF EXISTS ctx_staff_update ON public.customer_transactions;
DROP POLICY IF EXISTS ctx_staff_delete ON public.customer_transactions;
CREATE POLICY ctx_staff
ON public.customer_transactions
FOR SELECT
TO authenticated
USING (
  (SELECT private.is_staff())
  OR customer_id IN (
    SELECT c.id
    FROM public.customers c
    WHERE c.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY ctx_staff_manage
ON public.customer_transactions
FOR ALL
TO authenticated
USING ((SELECT private.is_staff()))
WITH CHECK ((SELECT private.is_staff()));

DROP POLICY IF EXISTS cti_staff ON public.customer_transaction_items;
DROP POLICY IF EXISTS cti_staff_manage ON public.customer_transaction_items;
DROP POLICY IF EXISTS cti_staff_update ON public.customer_transaction_items;
DROP POLICY IF EXISTS cti_staff_delete ON public.customer_transaction_items;
CREATE POLICY cti_staff
ON public.customer_transaction_items
FOR SELECT
TO authenticated
USING (
  (SELECT private.is_staff())
  OR transaction_id IN (
    SELECT ct.id
    FROM public.customer_transactions ct
    JOIN public.customers c ON c.id = ct.customer_id
    WHERE c.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY cti_staff_manage
ON public.customer_transaction_items
FOR ALL
TO authenticated
USING ((SELECT private.is_staff()))
WITH CHECK ((SELECT private.is_staff()));

DROP POLICY IF EXISTS orders_staff ON public.orders;
DROP POLICY IF EXISTS orders_staff_manage ON public.orders;
DROP POLICY IF EXISTS orders_staff_update ON public.orders;
DROP POLICY IF EXISTS orders_staff_delete ON public.orders;
CREATE POLICY orders_staff
ON public.orders
FOR SELECT
TO authenticated
USING (
  (SELECT private.is_staff())
  OR customer_id IN (
    SELECT c.id
    FROM public.customers c
    WHERE c.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY orders_staff_manage
ON public.orders
FOR ALL
TO authenticated
USING ((SELECT private.is_staff()))
WITH CHECK ((SELECT private.is_staff()));
