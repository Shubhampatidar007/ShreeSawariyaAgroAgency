-- Fix CMS section BOLA: public visibility must never grant DELETE/UPDATE/INSERT.
-- Keep all CMS mutations staff-only; public readers only see enabled public sections.
DROP POLICY IF EXISTS cms_staff ON public.cms_sections;
DROP POLICY IF EXISTS cms_staff_manage ON public.cms_sections;
CREATE POLICY cms_staff_manage
  ON public.cms_sections
  FOR ALL
  TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS cms_public_read_authenticated ON public.cms_sections;
CREATE POLICY cms_public_read_authenticated
  ON public.cms_sections
  FOR SELECT
  TO authenticated
  USING (enabled AND visibility = 'public');

-- Trigger functions are invoked by triggers, not directly through PostgREST.
REVOKE EXECUTE ON FUNCTION public.create_inventory_reminder() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.merge_product_publish_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_customer_transaction_item_product_links() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_order_item_product_links() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_order_item_variant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_inventory_variant_link() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_product_variant_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_checkout_otp_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_product_reference_consistency() FROM PUBLIC, anon, authenticated;
