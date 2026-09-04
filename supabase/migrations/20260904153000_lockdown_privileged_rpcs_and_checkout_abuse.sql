-- Lock down privileged RPC execution and add server-side anonymous checkout throttling.

REVOKE EXECUTE ON FUNCTION public.add_online_order_payment(uuid, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_online_order_payment(uuid, numeric, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_khata_sale(uuid, jsonb, numeric, text, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_khata_sale(uuid, jsonb, numeric, text, date, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_customer_order(jsonb, uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_order(jsonb, uuid, text, text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.place_cod_order(text, text, text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_cod_order(text, text, text, text, text, jsonb, text) TO anon, authenticated;

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.cod_checkout_rate_limits (
  id bigint generated always as identity primary key,
  mobile text NOT NULL,
  client_ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON private.cod_checkout_rate_limits FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS cod_checkout_rate_limits_mobile_created_idx
  ON private.cod_checkout_rate_limits (mobile, created_at DESC);
CREATE INDEX IF NOT EXISTS cod_checkout_rate_limits_ip_created_idx
  ON private.cod_checkout_rate_limits (client_ip, created_at DESC);

CREATE OR REPLACE FUNCTION public.place_cod_order(_customer_name text, _mobile text, _village text, _address text, _pincode text, _items jsonb, _remarks text DEFAULT NULL::text)
RETURNS TABLE(order_id uuid, order_code text, order_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, private'
AS $function$
DECLARE
  _order_id uuid;
  _order_code text;
  _subtotal numeric(12,2) := 0;
  _item jsonb;
  _product public.products%ROWTYPE;
  _qty numeric(12,2);
  _total_qty numeric(12,2);
  _rate numeric(12,2);
  _amount numeric(12,2);
  _inventory_quantity numeric(12,2);
  _normalized_mobile text;
  _client_ip inet;
  _recent_mobile_orders integer;
  _recent_ip_orders integer;
BEGIN
  _normalized_mobile := regexp_replace(COALESCE(_mobile, ''), '\\D', '', 'g');

  IF COALESCE(trim(_customer_name), '') = '' THEN RAISE EXCEPTION 'Customer name is required'; END IF;
  IF _normalized_mobile !~ '^[0-9]{10}$' THEN RAISE EXCEPTION 'Enter a valid 10 digit mobile number'; END IF;
  IF COALESCE(trim(_address), '') = '' THEN RAISE EXCEPTION 'Delivery address is required'; END IF;
  IF COALESCE(trim(_pincode), '') !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'Enter a valid 6 digit pincode'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 OR jsonb_array_length(_items) > 20 THEN
    RAISE EXCEPTION 'Cart must contain between 1 and 20 items';
  END IF;

  _client_ip := NULLIF(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), '')::inet;

  PERFORM pg_advisory_xact_lock(hashtextextended('cod-mobile:' || _normalized_mobile, 0));
  IF _client_ip IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('cod-ip:' || _client_ip::text, 0));
  END IF;

  SELECT count(*) INTO _recent_mobile_orders
  FROM public.orders
  WHERE channel = 'online'
    AND mobile = _normalized_mobile
    AND created_at > now() - interval '1 hour';
  IF _recent_mobile_orders >= 3 THEN
    RAISE EXCEPTION 'Too many checkout attempts. Please try again later';
  END IF;

  IF _client_ip IS NOT NULL THEN
    DELETE FROM private.cod_checkout_rate_limits WHERE created_at < now() - interval '2 hours';
    SELECT count(*) INTO _recent_ip_orders
    FROM private.cod_checkout_rate_limits
    WHERE client_ip = _client_ip
      AND created_at > now() - interval '1 hour';
    IF _recent_ip_orders >= 10 THEN
      RAISE EXCEPTION 'Too many checkout attempts from this network. Please try again later';
    END IF;
  END IF;

  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    IF NULLIF(_item->>'id', '') IS NULL THEN RAISE EXCEPTION 'Invalid cart item'; END IF;
    _qty := COALESCE((_item->>'qty')::numeric, 0);
    IF _qty <= 0 OR _qty > 1000 THEN RAISE EXCEPTION 'Invalid quantity for cart item'; END IF;

    SELECT COALESCE(SUM((value->>'qty')::numeric), 0) INTO _total_qty
    FROM jsonb_array_elements(_items)
    WHERE value->>'id' = _item->>'id';
    IF _total_qty > 1000 THEN RAISE EXCEPTION 'Quantity exceeds allowed limit'; END IF;

    SELECT * INTO _product
    FROM public.products
    WHERE id = (_item->>'id')::uuid
      AND visibility = 'public'
      AND status = 'published'
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'One of the products is no longer available'; END IF;
    IF _product.stock < _total_qty THEN RAISE EXCEPTION 'Insufficient stock for %', _product.title; END IF;

    _rate := COALESCE(_product.discount_price, _product.selling_price);
    IF _rate IS NULL OR _rate < 0 THEN RAISE EXCEPTION 'Invalid product price'; END IF;
    _amount := round(_rate * _qty, 2);
    _subtotal := _subtotal + _amount;
    IF _subtotal > 500000 THEN RAISE EXCEPTION 'Order amount exceeds allowed limit'; END IF;
  END LOOP;

  _order_id := gen_random_uuid();
  _order_code := 'SSA-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.orders (
    id, code, channel, customer_name, customer_type, village, mobile,
    delivery_address, pincode, subtotal, discount, tax, total, paid,
    payment_method, payment_status, delivery_status, order_status,
    invoice_status, remarks, timeline
  ) VALUES (
    _order_id, _order_code, 'online', trim(_customer_name), 'guest',
    COALESCE(trim(_village), ''), _normalized_mobile, trim(_address), trim(_pincode),
    _subtotal, 0, 0, _subtotal, 0, 'cod', 'pending', 'scheduled', 'pending', 'not-generated',
    NULLIF(trim(COALESCE(_remarks, '')), ''),
    jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'label', 'Order placed', 'at', now()))
  );

  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    _qty := (_item->>'qty')::numeric;
    SELECT * INTO _product
    FROM public.products
    WHERE id = (_item->>'id')::uuid
      AND visibility = 'public'
      AND status = 'published'
    FOR UPDATE;

    _rate := COALESCE(_product.discount_price, _product.selling_price);
    _amount := round(_rate * _qty, 2);
    INSERT INTO public.order_items (order_id, product_id, product, quantity, unit, rate, amount)
    VALUES (_order_id, _product.id, _product.title, _qty, _product.category, _rate, _amount);

    IF _product.inventory_id IS NOT NULL THEN
      SELECT quantity INTO _inventory_quantity
      FROM public.inventory_items
      WHERE id = _product.inventory_id
      FOR UPDATE;
      IF NOT FOUND OR _inventory_quantity < _qty THEN
        RAISE EXCEPTION 'Insufficient inventory stock for %', _product.title;
      END IF;
      UPDATE public.inventory_items
      SET quantity = quantity - _qty,
          last_updated = current_date,
          updated_at = now(),
          status = CASE WHEN quantity - _qty <= 0 THEN 'out-of-stock' ELSE status END
      WHERE id = _product.inventory_id;
    END IF;

    UPDATE public.products SET stock = stock - _qty, updated_at = now() WHERE id = _product.id;
  END LOOP;

  INSERT INTO private.cod_checkout_rate_limits(mobile, client_ip) VALUES (_normalized_mobile, _client_ip);
  RETURN QUERY SELECT _order_id, _order_code, _subtotal;
END;
$function$;
