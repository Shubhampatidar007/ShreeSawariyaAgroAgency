-- Public storefront checkout: Cash on Delivery only.
-- The function is SECURITY DEFINER so anonymous shoppers never receive direct
-- INSERT access to orders/order_items. Stock is checked and decremented in one
-- transaction to prevent overselling.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pincode text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.place_cod_order(
  _customer_name text,
  _mobile text,
  _village text,
  _address text,
  _pincode text,
  _items jsonb,
  _remarks text DEFAULT NULL
)
RETURNS TABLE(order_id uuid, order_code text, order_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid;
  _order_code text;
  _subtotal numeric(12,2) := 0;
  _item jsonb;
  _product public.products%ROWTYPE;
  _qty numeric(12,2);
  _rate numeric(12,2);
  _amount numeric(12,2);
  _inventory_quantity numeric(12,2);
BEGIN
  IF COALESCE(trim(_customer_name), '') = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF regexp_replace(COALESCE(_mobile, ''), '\\D', '', 'g') !~ '^[0-9]{10}$' THEN
    RAISE EXCEPTION 'Enter a valid 10 digit mobile number';
  END IF;

  IF COALESCE(trim(_address), '') = '' THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;

  IF COALESCE(trim(_pincode), '') !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'Enter a valid 6 digit pincode';
  END IF;

  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty';
  END IF;

  -- Lock every requested product before calculating totals/decrementing stock.
  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    IF NULLIF(_item->>'id', '') IS NULL THEN
      RAISE EXCEPTION 'Invalid cart item';
    END IF;

    _qty := COALESCE((_item->>'qty')::numeric, 0);
    IF _qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for cart item';
    END IF;

    SELECT * INTO _product
    FROM public.products
    WHERE id = (_item->>'id')::uuid
      AND visibility = 'public'
      AND status = 'published'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'One of the products is no longer available';
    END IF;

    IF _product.stock < _qty THEN
      RAISE EXCEPTION 'Insufficient stock for %', _product.title;
    END IF;

    _rate := COALESCE(_product.discount_price, _product.selling_price);
    _amount := round(_rate * _qty, 2);
    _subtotal := _subtotal + _amount;
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
    COALESCE(trim(_village), ''), regexp_replace(_mobile, '\\D', '', 'g'),
    trim(_address), trim(_pincode), _subtotal, 0, 0, _subtotal, 0,
    'cod', 'pending', 'scheduled', 'pending', 'not-generated',
    NULLIF(trim(COALESCE(_remarks, '')), ''),
    jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid(),
      'label', 'Order placed',
      'at', now()
    ))
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

    INSERT INTO public.order_items (
      order_id, product_id, product, quantity, unit, rate, amount
    ) VALUES (
      _order_id, _product.id, _product.title, _qty, _product.category, _rate, _amount
    );

    UPDATE public.products
    SET stock = stock - _qty,
        updated_at = now()
    WHERE id = _product.id;

    IF _product.inventory_id IS NOT NULL THEN
      SELECT quantity INTO _inventory_quantity
      FROM public.inventory_items
      WHERE id = _product.inventory_id
      FOR UPDATE;

      IF FOUND THEN
        UPDATE public.inventory_items
        SET quantity = GREATEST(quantity - _qty, 0),
            last_updated = current_date,
            updated_at = now()
        WHERE id = _product.inventory_id;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT _order_id, _order_code, _subtotal;
END;
$$;

REVOKE ALL ON FUNCTION public.place_cod_order(text, text, text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_cod_order(text, text, text, text, text, jsonb, text) TO anon, authenticated;
