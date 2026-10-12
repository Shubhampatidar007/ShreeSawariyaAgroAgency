-- Prevent authenticated customers from creating arbitrary custom-priced online order lines.
-- Normal storefront items continue to use product_variant_id and server-fetched database prices.
-- This patches the existing function definition in place so the current inventory/order logic is preserved.
DO $security$
DECLARE
  v_definition text;
  v_old text := $old$    v_is_custom := coalesce(nullif(v_item->>'is_custom', '')::boolean, false);$old$;
  v_new text := $new$    v_is_custom := coalesce(nullif(v_item->>'is_custom', '')::boolean, false);
    IF v_is_custom AND NOT (SELECT private.is_staff()) THEN
      RAISE EXCEPTION 'Custom-priced checkout items are staff-only';
    END IF;$new$;
BEGIN
  SELECT pg_get_functiondef(
    'public.create_customer_order(jsonb,uuid,text,text,text,text,text,text)'::regprocedure
  ) INTO v_definition;

  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Expected custom-item validation block was not found; refusing to modify create_customer_order';
  END IF;

  v_definition := replace(v_definition, v_old, v_new);
  EXECUTE v_definition;
END;
$security$;
