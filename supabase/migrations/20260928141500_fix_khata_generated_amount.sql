-- customer_transaction_items.amount must be writable because Khata sales
-- support a final line-amount override after the calculated amount.
-- The old generated quantity * rate expression is not valid for normalized
-- unit conversions and prevents the RPC from inserting the negotiated amount.

ALTER TABLE public.customer_transaction_items
  ALTER COLUMN amount DROP EXPRESSION;

CREATE OR REPLACE FUNCTION public.create_khata_sale_with_bargaining(_customer_id uuid, _items jsonb, _paid numeric DEFAULT 0, _bargaining_amount numeric DEFAULT 0, _method text DEFAULT 'cash'::text, _entry_date date DEFAULT CURRENT_DATE, _remarks text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_inventory_id uuid;
  v_product_name text;
  v_qty numeric;
  v_entered_unit text;
  v_base_unit text;
  v_base_qty numeric;
  v_rate numeric;
  v_calculated_amount numeric;
  v_final_amount numeric;
  v_purchase_cost_per_base_unit numeric;
  v_available_base_qty numeric;
  v_package_size numeric;
  v_allow_loose_sale boolean;
  v_package_unit text;
  v_subtotal numeric := 0;
  v_bargaining numeric := coalesce(_bargaining_amount, 0);
  v_final_total numeric := 0;
  v_item_count integer := 0;
  v_tx_id uuid;
  v_summary text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = _customer_id) THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;
  IF _paid IS NULL OR _paid < 0 OR _paid = 'NaN'::numeric THEN
    RAISE EXCEPTION 'Paid amount cannot be negative';
  END IF;
  IF v_bargaining < 0 OR v_bargaining = 'NaN'::numeric THEN
    RAISE EXCEPTION 'Bargaining amount cannot be negative';
  END IF;

  -- Preview/validation pass. All stock values are resolved from the locked inventory row.
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := coalesce(nullif(v_item->>'quantity','')::numeric, 0);
    v_rate := coalesce(nullif(v_item->>'rate','')::numeric, 0);
    v_final_amount := CASE
      WHEN nullif(v_item->>'final_amount','') IS NULL THEN NULL
      ELSE (v_item->>'final_amount')::numeric
    END;
    v_product_name := coalesce(nullif(v_item->>'product',''), 'Item');
    v_entered_unit := coalesce(nullif(trim(v_item->>'unit'), ''), 'unit');
    v_product_id := nullif(v_item->>'product_id','')::uuid;
    v_variant_id := nullif(v_item->>'product_variant_id','')::uuid;
    v_inventory_id := nullif(v_item->>'inventory_id','')::uuid;

    IF v_qty <= 0 OR v_qty = 'NaN'::numeric THEN
      RAISE EXCEPTION 'Quantity must be greater than zero for %', v_product_name;
    END IF;
    IF v_rate < 0 OR v_rate = 'NaN'::numeric THEN
      RAISE EXCEPTION 'Selling rate cannot be negative for %', v_product_name;
    END IF;

    IF v_variant_id IS NOT NULL THEN
      SELECT product_id, inventory_id
      INTO v_product_id, v_inventory_id
      FROM public.product_variants
      WHERE id = v_variant_id
      FOR UPDATE;

      IF v_inventory_id IS NULL THEN
        RAISE EXCEPTION 'Product variant has no inventory source for %', v_product_name;
      END IF;
    END IF;

    IF v_inventory_id IS NULL AND v_product_id IS NOT NULL THEN
      SELECT inventory_id INTO v_inventory_id
      FROM public.products
      WHERE id = v_product_id
      FOR UPDATE;
    END IF;

    IF v_inventory_id IS NOT NULL THEN
      SELECT
        ii.base_unit,
        ii.base_quantity,
        ii.package_size,
        ii.allow_loose_sale,
        ii.unit,
        ii.purchase_price_per_base_unit
      INTO
        v_base_unit,
        v_available_base_qty,
        v_package_size,
        v_allow_loose_sale,
        v_package_unit,
        v_purchase_cost_per_base_unit
      FROM public.inventory_items ii
      WHERE ii.id = v_inventory_id
      FOR UPDATE;

      IF v_base_unit IS NULL THEN
        RAISE EXCEPTION 'Inventory item not found for %', v_product_name;
      END IF;

      IF v_allow_loose_sale THEN
        v_base_qty := public.convert_unit_quantity(v_qty, v_entered_unit, v_base_unit);
      ELSE
        IF lower(trim(v_entered_unit)) <> lower(trim(v_package_unit)) THEN
          RAISE EXCEPTION '% can only be sold as %', v_product_name, v_package_unit;
        END IF;
        IF v_qty <> trunc(v_qty) THEN
          RAISE EXCEPTION '% must be sold in complete packs', v_product_name;
        END IF;
        v_base_qty := round(v_qty * v_package_size, 6);
      END IF;

      IF v_base_qty <= 0 THEN
        RAISE EXCEPTION 'Converted quantity must be greater than zero for %', v_product_name;
      END IF;
      IF v_base_qty > coalesce(v_available_base_qty, 0) THEN
        RAISE EXCEPTION
          'Insufficient stock for %: available % %, requested % %',
          v_product_name,
          coalesce(v_available_base_qty, 0), v_base_unit,
          v_base_qty, v_base_unit;
      END IF;
    ELSE
      v_base_unit := v_entered_unit;
      v_base_qty := v_qty;
      v_available_base_qty := NULL;
      v_package_size := 1;
      v_purchase_cost_per_base_unit := 0;
    END IF;

    v_calculated_amount := round(v_base_qty * v_rate, 2);
    v_final_amount := coalesce(v_final_amount, v_calculated_amount);

    IF v_final_amount < 0 OR v_final_amount = 'NaN'::numeric THEN
      RAISE EXCEPTION 'Final sale amount cannot be negative for %', v_product_name;
    END IF;

    v_subtotal := v_subtotal + v_final_amount;
    v_item_count := v_item_count + 1;
  END LOOP;

  IF v_bargaining > v_subtotal THEN
    RAISE EXCEPTION 'Bargaining amount (%) cannot exceed sale subtotal (%)', v_bargaining, v_subtotal;
  END IF;

  v_final_total := round(v_subtotal - v_bargaining, 2);

  IF _paid > v_final_total THEN
    RAISE EXCEPTION 'Paid amount (%) cannot exceed final sale total (%)', _paid, v_final_total;
  END IF;

  SELECT coalesce(nullif(x->>'product',''), 'Item')
  INTO v_summary
  FROM jsonb_array_elements(_items) AS x
  LIMIT 1;

  IF v_item_count > 1 THEN
    v_summary := v_summary || ' + ' || (v_item_count - 1) || ' more';
  END IF;

  INSERT INTO public.customer_transactions(
    customer_id, entry_date, entry_type, product, quantity,
    subtotal, discount_amount, amount, payment, method, remarks
  )
  VALUES(
    _customer_id, coalesce(_entry_date,current_date), 'sale', v_summary, v_item_count,
    v_subtotal, v_bargaining, v_final_total, _paid, coalesce(_method,'cash'), _remarks
  )
  RETURNING id INTO v_tx_id;

  -- Commit pass. Revalidate stock immediately before each deduction so multiple lines
  -- against the same inventory row cannot oversell it.
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::numeric;
    v_rate := (v_item->>'rate')::numeric;
    v_entered_unit := coalesce(nullif(trim(v_item->>'unit'), ''), 'unit');
    v_product_name := coalesce(nullif(v_item->>'product',''), 'Item');
    v_variant_id := nullif(v_item->>'product_variant_id','')::uuid;
    v_inventory_id := nullif(v_item->>'inventory_id','')::uuid;
    v_product_id := nullif(v_item->>'product_id','')::uuid;

    IF v_variant_id IS NOT NULL THEN
      SELECT product_id, inventory_id
      INTO v_product_id, v_inventory_id
      FROM public.product_variants
      WHERE id = v_variant_id;
    END IF;

    IF v_inventory_id IS NULL AND v_product_id IS NOT NULL THEN
      SELECT inventory_id INTO v_inventory_id
      FROM public.products
      WHERE id = v_product_id;
    END IF;

    v_final_amount := CASE
      WHEN nullif(v_item->>'final_amount','') IS NULL
        THEN NULL
      ELSE (v_item->>'final_amount')::numeric
    END;

    IF v_inventory_id IS NOT NULL THEN
      SELECT
        ii.base_unit,
        ii.base_quantity,
        ii.package_size,
        ii.allow_loose_sale,
        ii.unit,
        ii.purchase_price_per_base_unit
      INTO
        v_base_unit,
        v_available_base_qty,
        v_package_size,
        v_allow_loose_sale,
        v_package_unit,
        v_purchase_cost_per_base_unit
      FROM public.inventory_items ii
      WHERE ii.id = v_inventory_id
      FOR UPDATE;

      IF v_allow_loose_sale THEN
        v_base_qty := public.convert_unit_quantity(v_qty, v_entered_unit, v_base_unit);
      ELSE
        IF lower(trim(v_entered_unit)) <> lower(trim(v_package_unit)) OR v_qty <> trunc(v_qty) THEN
          RAISE EXCEPTION '% must be sold as complete % packs', v_product_name, v_package_unit;
        END IF;
        v_base_qty := round(v_qty * v_package_size, 6);
      END IF;

      IF v_base_qty > coalesce(v_available_base_qty,0) THEN
        RAISE EXCEPTION
          'Insufficient stock for %: available % %, requested % %',
          v_product_name, coalesce(v_available_base_qty,0), v_base_unit, v_base_qty, v_base_unit;
      END IF;

      v_calculated_amount := round(v_base_qty * v_rate, 2);
      v_final_amount := coalesce(v_final_amount, v_calculated_amount);

      INSERT INTO public.customer_transaction_items(
        transaction_id, product_id, product_variant_id, product, quantity, unit, rate, amount,
        purchase_cost, admin_price_inc,
        entered_quantity, entered_unit, base_quantity, base_unit,
        purchase_cost_per_base_unit, selling_rate_per_base_unit,
        calculated_amount, final_sale_amount
      )
      VALUES(
        v_tx_id, v_product_id, v_variant_id, v_product_name, v_qty, v_entered_unit, v_rate, round(v_final_amount,2),
        v_purchase_cost_per_base_unit, v_rate,
        v_qty, v_entered_unit, v_base_qty, v_base_unit,
        v_purchase_cost_per_base_unit, v_rate,
        v_calculated_amount, round(v_final_amount,2)
      );

      UPDATE public.inventory_items
      SET quantity = quantity - round(v_base_qty / package_size, 6),
          last_updated = current_date,
          status = CASE
            WHEN base_quantity - v_base_qty <= 0 THEN 'out-of-stock'
            ELSE status
          END
      WHERE id = v_inventory_id;

    ELSE
      v_base_unit := v_entered_unit;
      v_base_qty := v_qty;
      v_purchase_cost_per_base_unit := 0;
      v_calculated_amount := round(v_base_qty * v_rate, 2);
      v_final_amount := coalesce(v_final_amount, v_calculated_amount);

      INSERT INTO public.customer_transaction_items(
        transaction_id, product_id, product_variant_id, product, quantity, unit, rate, amount,
        purchase_cost, admin_price_inc,
        entered_quantity, entered_unit, base_quantity, base_unit,
        purchase_cost_per_base_unit, selling_rate_per_base_unit,
        calculated_amount, final_sale_amount
      )
      VALUES(
        v_tx_id, v_product_id, v_variant_id, v_product_name, v_qty, v_entered_unit, v_rate, round(v_final_amount,2),
        0, v_rate,
        v_qty, v_entered_unit, v_base_qty, v_base_unit,
        0, v_rate,
        v_calculated_amount, round(v_final_amount,2)
      );

      IF v_product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock = stock - v_qty, updated_at = now()
        WHERE id = v_product_id AND stock >= v_qty;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Insufficient product stock for %', v_product_name;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN v_tx_id;
END;
$function$


REVOKE EXECUTE ON FUNCTION public.create_khata_sale_with_bargaining(uuid, jsonb, numeric, numeric, text, date, text)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_khata_sale_with_bargaining(uuid, jsonb, numeric, numeric, text, date, text)
  TO authenticated;
