-- Customer product returns.
-- The return is stored as a negative customer ledger amount so the existing
-- balance trigger reduces due and represents excess credit as advance implicitly.
-- Inventory/product/variant changes are performed in the same transaction.

CREATE OR REPLACE FUNCTION public.record_customer_product_return(
  _customer_id uuid,
  _items jsonb,
  _entry_date date DEFAULT current_date,
  _remarks text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_customer_exists boolean;
  v_customer_due numeric;
  v_product_id uuid;
  v_inventory_id uuid;
  v_variant_id uuid;
  v_product_name text;
  v_qty numeric;
  v_price numeric;
  v_unit text;
  v_loose boolean;
  v_inventory_unit text;
  v_qty_inventory numeric;
  v_inventory_quantity numeric;
  v_purchase_price numeric;
  v_allow_loose boolean;
  v_inventory_status text;
  v_total numeric := 0;
  v_item_count integer := 0;
  v_tx_id uuid;
  v_due_after numeric;
  v_due_reduced numeric;
  v_advance_added numeric;
  v_summary text;
  v_from_factor numeric;
  v_to_factor numeric;
  v_from_group text;
  v_to_group text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.customers WHERE id = _customer_id
  ) INTO v_customer_exists;

  IF NOT v_customer_exists THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'At least one return item is required';
  END IF;

  SELECT current_due INTO v_customer_due
  FROM public.customers
  WHERE id = _customer_id
  FOR UPDATE;

  v_customer_due := GREATEST(COALESCE(v_customer_due, 0), 0);

  -- Validate every line and resolve its inventory context before any mutation.
  FOR v_item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::uuid;
    v_variant_id := NULLIF(v_item->>'product_variant_id', '')::uuid;
    v_product_name := COALESCE(NULLIF(trim(v_item->>'product'), ''), 'Returned item');
    v_qty := COALESCE(NULLIF(v_item->>'quantity', '')::numeric, 0);
    v_price := COALESCE(NULLIF(v_item->>'price', '')::numeric, 0);
    v_unit := lower(trim(COALESCE(NULLIF(v_item->>'unit', ''), 'unit')));
    v_loose := COALESCE(NULLIF(v_item->>'loose', '')::boolean, false);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantity must be greater than zero for %', v_product_name;
    END IF;

    IF v_price <= 0 THEN
      RAISE EXCEPTION 'Return price must be greater than zero for %', v_product_name;
    END IF;

    -- Variant is the strongest identity when provided.
    IF v_variant_id IS NOT NULL THEN
      SELECT product_id, inventory_id
      INTO v_product_id, v_inventory_id
      FROM public.product_variants
      WHERE id = v_variant_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product variant not found for %', v_product_name;
      END IF;
    END IF;

    IF v_inventory_id IS NULL AND v_product_id IS NOT NULL THEN
      SELECT inventory_id
      INTO v_inventory_id
      FROM public.products
      WHERE id = v_product_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found for %', v_product_name;
      END IF;
    END IF;

    IF v_inventory_id IS NOT NULL THEN
      SELECT
        i.unit,
        i.quantity,
        i.purchase_price,
        COALESCE(i.allow_loose_sale, false)
      INTO
        v_inventory_unit,
        v_inventory_quantity,
        v_purchase_price,
        v_allow_loose
      FROM public.inventory_items i
      WHERE i.id = v_inventory_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item not found for %', v_product_name;
      END IF;

      IF NOT v_loose AND lower(trim(v_unit)) <> lower(trim(v_inventory_unit)) THEN
        RAISE EXCEPTION 'Unit % must match inventory unit % unless Loose / open is enabled',
          v_unit, v_inventory_unit;
      END IF;

      IF v_loose THEN
        v_from_group := CASE
          WHEN v_unit IN ('g','gm','gram','grams','kg','kgs','kilo','kilos','kilogram','kilograms','q','quintal','quintals','t','ton','tons','tonne','tonnes')
            THEN 'weight'
          WHEN v_unit IN ('ml','millilitre','millilitres','milliliter','milliliters','l','lt','ltr','litre','litres','liter','liters')
            THEN 'volume'
          ELSE v_unit
        END;

        v_to_group := CASE
          WHEN lower(trim(v_inventory_unit)) IN ('g','gm','gram','grams','kg','kgs','kilo','kilos','kilogram','kilograms','q','quintal','quintals','t','ton','tons','tonne','tonnes')
            THEN 'weight'
          WHEN lower(trim(v_inventory_unit)) IN ('ml','millilitre','millilitres','milliliter','milliliters','l','lt','ltr','litre','litres','liter','liters')
            THEN 'volume'
          ELSE lower(trim(v_inventory_unit))
        END;

        IF v_from_group <> v_to_group THEN
          RAISE EXCEPTION 'Unit % is not compatible with inventory unit % for %',
            v_unit, v_inventory_unit, v_product_name;
        END IF;

        v_from_factor := CASE
          WHEN v_unit IN ('g','gm','gram','grams') THEN 1
          WHEN v_unit IN ('kg','kgs','kilo','kilos','kilogram','kilograms') THEN 1000
          WHEN v_unit IN ('q','quintal','quintals') THEN 100000
          WHEN v_unit IN ('t','ton','tons','tonne','tonnes') THEN 1000000
          WHEN v_unit IN ('ml','millilitre','millilitres','milliliter','milliliters') THEN 1
          WHEN v_unit IN ('l','lt','ltr','litre','litres','liter','liters') THEN 1000
          ELSE 1
        END;

        v_to_factor := CASE
          WHEN lower(trim(v_inventory_unit)) IN ('g','gm','gram','grams') THEN 1
          WHEN lower(trim(v_inventory_unit)) IN ('kg','kgs','kilo','kilos','kilogram','kilograms') THEN 1000
          WHEN lower(trim(v_inventory_unit)) IN ('q','quintal','quintals') THEN 100000
          WHEN lower(trim(v_inventory_unit)) IN ('t','ton','tons','tonne','tonnes') THEN 1000000
          WHEN lower(trim(v_inventory_unit)) IN ('ml','millilitre','millilitres','milliliter','milliliters') THEN 1
          WHEN lower(trim(v_inventory_unit)) IN ('l','lt','ltr','litre','litres','liter','liters') THEN 1000
          ELSE 1
        END;

        v_qty_inventory := round(v_qty * v_from_factor / v_to_factor, 6);
      ELSE
        v_qty_inventory := v_qty;
      END IF;
    ELSE
      -- Product exists without inventory: the return will create its inventory lot.
      v_qty_inventory := v_qty;
    END IF;

    IF v_qty_inventory <= 0 THEN
      RAISE EXCEPTION 'Converted return quantity must be greater than zero for %', v_product_name;
    END IF;

    v_total := v_total + round(v_qty * v_price, 2);
    v_item_count := v_item_count + 1;
  END LOOP;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Return total must be greater than zero';
  END IF;

  SELECT COALESCE(NULLIF(x->>'product', ''), 'Returned item')
  INTO v_summary
  FROM jsonb_array_elements(_items) AS x
  LIMIT 1;

  IF v_item_count > 1 THEN
    v_summary := 'Return: ' || v_summary || ' + ' || (v_item_count - 1) || ' more';
  ELSE
    v_summary := 'Return: ' || v_summary;
  END IF;

  -- Negative amount is a customer credit. Existing customer balance trigger
  -- recalculates current_due/credit_balance and remaining_due atomically.
  INSERT INTO public.customer_transactions
    (customer_id, entry_date, entry_type, product, quantity, subtotal, discount_amount,
     amount, payment, method, remarks)
  VALUES
    (_customer_id, COALESCE(_entry_date, current_date), 'return', v_summary, v_item_count,
     v_total, 0, -v_total, 0, 'credit',
     COALESCE(_remarks, 'Customer product return'))
  RETURNING id INTO v_tx_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::uuid;
    v_variant_id := NULLIF(v_item->>'product_variant_id', '')::uuid;
    v_product_name := COALESCE(NULLIF(trim(v_item->>'product'), ''), 'Returned item');
    v_qty := COALESCE(NULLIF(v_item->>'quantity', '')::numeric, 0);
    v_price := COALESCE(NULLIF(v_item->>'price', '')::numeric, 0);
    v_unit := lower(trim(COALESCE(NULLIF(v_item->>'unit', ''), 'unit')));
    v_loose := COALESCE(NULLIF(v_item->>'loose', '')::boolean, false);

    IF v_variant_id IS NOT NULL THEN
      SELECT product_id, inventory_id
      INTO v_product_id, v_inventory_id
      FROM public.product_variants
      WHERE id = v_variant_id
      FOR UPDATE;
    END IF;

    IF v_inventory_id IS NULL AND v_product_id IS NOT NULL THEN
      SELECT inventory_id INTO v_inventory_id
      FROM public.products
      WHERE id = v_product_id
      FOR UPDATE;
    END IF;

    IF v_inventory_id IS NOT NULL THEN
      SELECT unit, purchase_price, quantity
      INTO v_inventory_unit, v_purchase_price, v_inventory_quantity
      FROM public.inventory_items
      WHERE id = v_inventory_id
      FOR UPDATE;

      IF v_loose THEN
        v_from_factor := CASE
          WHEN v_unit IN ('g','gm','gram','grams') THEN 1
          WHEN v_unit IN ('kg','kgs','kilo','kilos','kilogram','kilograms') THEN 1000
          WHEN v_unit IN ('q','quintal','quintals') THEN 100000
          WHEN v_unit IN ('t','ton','tons','tonne','tonnes') THEN 1000000
          WHEN v_unit IN ('ml','millilitre','millilitres','milliliter','milliliters') THEN 1
          WHEN v_unit IN ('l','lt','ltr','litre','litres','liter','liters') THEN 1000
          ELSE 1
        END;
        v_to_factor := CASE
          WHEN lower(trim(v_inventory_unit)) IN ('g','gm','gram','grams') THEN 1
          WHEN lower(trim(v_inventory_unit)) IN ('kg','kgs','kilo','kilos','kilogram','kilograms') THEN 1000
          WHEN lower(trim(v_inventory_unit)) IN ('q','quintal','quintals') THEN 100000
          WHEN lower(trim(v_inventory_unit)) IN ('t','ton','tons','tonne','tonnes') THEN 1000000
          WHEN lower(trim(v_inventory_unit)) IN ('ml','millilitre','millilitres','milliliter','milliliters') THEN 1
          WHEN lower(trim(v_inventory_unit)) IN ('l','lt','ltr','litre','litres','liter','liters') THEN 1000
          ELSE 1
        END;
        v_qty_inventory := round(v_qty * v_from_factor / v_to_factor, 6);
      ELSE
        v_qty_inventory := v_qty;
      END IF;

      UPDATE public.inventory_items
      SET quantity = quantity + v_qty_inventory,
          last_updated = COALESCE(_entry_date, current_date),
          updated_at = now(),
          status = CASE WHEN quantity + v_qty_inventory > 0 THEN 'in-stock' ELSE status END
      WHERE id = v_inventory_id;
    ELSE
      v_qty_inventory := v_qty;

      INSERT INTO public.inventory_items
        (product_name, supplier_id, supplier_name, quantity, unit, purchase_price,
         selling_price, min_stock_level, status, last_updated, allow_loose_sale)
      VALUES
        (v_product_name, NULL, 'Customer return', v_qty_inventory, v_unit, v_price,
         v_price, 0, 'in-stock', COALESCE(_entry_date, current_date), v_loose)
      RETURNING id INTO v_inventory_id;

      IF v_product_id IS NOT NULL THEN
        UPDATE public.products
        SET inventory_id = v_inventory_id,
            stock = v_qty_inventory,
            updated_at = now()
        WHERE id = v_product_id
          AND inventory_id IS NULL;
      END IF;
    END IF;

    -- Resolve/create the variant that represents this exact inventory row.
    SELECT pv.id, COALESCE(pv.product_id, v_product_id)
    INTO v_variant_id, v_product_id
    FROM public.product_variants pv
    WHERE pv.inventory_id = v_inventory_id
    ORDER BY pv.created_at
    LIMIT 1
    FOR UPDATE;

    IF v_variant_id IS NULL THEN
      INSERT INTO public.product_variants
        (product_id, inventory_id, label, selling_price, stock, status)
      VALUES
        (v_product_id, v_inventory_id, v_unit, v_price,
         (SELECT quantity FROM public.inventory_items WHERE id = v_inventory_id),
         'active')
      RETURNING id INTO v_variant_id;
    ELSE
      UPDATE public.product_variants
      SET product_id = COALESCE(product_id, v_product_id),
          stock = (SELECT quantity FROM public.inventory_items WHERE id = v_inventory_id),
          updated_at = now()
      WHERE id = v_variant_id;
    END IF;

    UPDATE public.inventory_items
    SET product_variant_id = v_variant_id
    WHERE id = v_inventory_id;

    IF v_product_id IS NOT NULL THEN
      UPDATE public.products p
      SET stock = (
        SELECT COALESCE(SUM(pv.stock), 0)
        FROM public.product_variants pv
        WHERE pv.product_id = p.id
      ),
      updated_at = now()
      WHERE p.id = v_product_id;
    END IF;

    INSERT INTO public.customer_transaction_items
      (transaction_id, product_id, product_variant_id, product, quantity, unit, rate, purchase_cost, admin_price_inc)
    VALUES
      (
        v_tx_id,
        v_product_id,
        v_variant_id,
        v_product_name,
        v_qty,
        v_unit,
        v_price,
        COALESCE((SELECT purchase_price FROM public.inventory_items WHERE id = v_inventory_id), v_price),
        v_price
      );
  END LOOP;

  SELECT current_due INTO v_due_after
  FROM public.customers
  WHERE id = _customer_id;

  v_due_after := GREATEST(COALESCE(v_due_after, 0), 0);
  v_due_reduced := LEAST(v_customer_due, v_total);
  v_advance_added := GREATEST(v_total - v_customer_due, 0);

  RETURN jsonb_build_object(
    'transaction_id', v_tx_id,
    'total', round(v_total, 2),
    'due_before', round(v_customer_due, 2),
    'due_reduced', round(v_due_reduced, 2),
    'due_after', round(v_due_after, 2),
    'advance_added', round(v_advance_added, 2)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_customer_product_return(uuid, jsonb, date, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_customer_product_return(uuid, jsonb, date, text)
  TO authenticated;
