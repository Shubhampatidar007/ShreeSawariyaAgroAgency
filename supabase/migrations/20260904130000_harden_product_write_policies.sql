-- Security hardening: public/authenticated storefront reads must not imply write access.
-- Only admin/staff may create, update, or delete products and product variants.

DROP POLICY IF EXISTS "products_staff" ON public.products;
DROP POLICY IF EXISTS "products_public_read_authenticated" ON public.products;

CREATE POLICY "products_public_read_authenticated"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (visibility = 'public' AND status = 'published');

CREATE POLICY "products_staff_manage"
  ON public.products
  FOR ALL
  TO authenticated
  USING ((SELECT private.is_staff()))
  WITH CHECK ((SELECT private.is_staff()));

DROP POLICY IF EXISTS "product variants staff manage" ON public.product_variants;
DROP POLICY IF EXISTS "product_variants_public_read_authenticated" ON public.product_variants;

CREATE POLICY "product_variants_public_read_authenticated"
  ON public.product_variants
  FOR SELECT
  TO authenticated
  USING (
    product_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.visibility = 'public'
        AND p.status = 'published'
    )
  );

CREATE POLICY "product_variants_staff_manage"
  ON public.product_variants
  FOR ALL
  TO authenticated
  USING ((SELECT private.is_staff()))
  WITH CHECK ((SELECT private.is_staff()));

-- Defense in depth: these mutation RPCs already enforce staff authorization.
-- Remove the default PUBLIC EXECUTE privilege as well as the explicit anon grant.
REVOKE EXECUTE ON FUNCTION public.publish_inventory_product(uuid, uuid, text, text, numeric, numeric, text, text[], text[], text, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.upsert_product_variant(uuid, uuid, text, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_inventory_product(uuid, uuid, text, text, numeric, numeric, text, text[], text[], text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_product_variant(uuid, uuid, text, numeric, numeric) TO authenticated;
