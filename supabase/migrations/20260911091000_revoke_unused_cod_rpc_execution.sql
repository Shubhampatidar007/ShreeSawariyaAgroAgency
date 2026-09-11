-- Security hardening: close the unused privileged COD RPC API boundary.
-- The storefront uses create_customer_order for authenticated checkout, while
-- place_cod_order is not required by the current client path.
REVOKE EXECUTE ON FUNCTION public.place_cod_order(text, text, text, text, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;

-- Keep the supplier purchase RPC server-only; its body already performs a
-- private.is_staff() authorization check.
REVOKE EXECUTE ON FUNCTION public.record_supplier_purchase_session(uuid, jsonb, numeric, text, date, text, timestamptz) FROM PUBLIC, anon, authenticated;

-- Role helpers are authorization primitives, not client APIs.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
