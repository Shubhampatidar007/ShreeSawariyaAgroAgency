-- Support base-unit / loose-quantity Khata sales.
-- The function prices loose quantities from the stored per-base-unit rate and
-- decrements base_quantity so partial sales cannot oversell inventory.

CREATE OR REPLACE FUNCTION public.create_khata_sale_with_bargaining(
  _customer_id uuid,
  _items jsonb,
  _paid numeric DEFAULT 0,
  _bargaining_amount numeric DEFAULT 0,
  _method text DEFAULT 'cash',
  _entry_date date DEFAULT current_date,
  _remarks text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_product_id uuid;
  v_product_name text;
  v_qty numeric;
  v_rate numeric;
  v_sale_unit text;
  v_inventory_id uuid;
  v_variant_id uuid;
  v_purchase_cost numeric;
  v_purchase_cost_per_base numeric;
  v_available numeric;
  v_base_available numeric;
  v_base_qty numeric;
  v_base_unit text;
  v_package_size numeric;
  v_allow_loose boolean;
  v_item_amount numeric;
  v_subtotal numeric := 0;
  v_bargaining numeric := COALESCE(_bargaining_amount, 0);
  v_final_total numeric := 0;
  v_item_count int := 0;
  v_tx_id uuid;
  v_summary text;
  v_new_base numeric;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = _customer_id) THEN RAISE EXCEPTION 'Customer not found'; END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'At least one item is required'; END IF;
  IF _paid IS NULL OR _paid < 0 THEN RAISE EXCEPTION 'Paid amount cannot be negative'; END IF;
  IF v_bargaining < 0 THEN RAISE EXCEPTION 'Bargaining amount cannot be negative'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE(NULLIF(v_item->>'quantity', '')::numeric, 0);
    v_rate := COALESCE(NULLIF(v_item->>'rate', '')::numeric, 0);
    v_product_name := COALESCE(NULLIF(v_item->>'product', ''), 'Item');
    v_sale_unit := COALESCE(NULLIF(trim(v_item->>'unit'), ''), 'unit');
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::uuid;
    v_variant_id := NULLIF(v_item->>'product_variant_id', '')::uuid;

    IF v_qty <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero for %', v_product_name; END IF;
    IF v_rate < 0 THEN RAISE EXCEPTION 'Selling price cannot be negative for %', v_product_name; END IF;

    v_base_qty := NULL; v_base_unit := NULL; v_package_size := 1; v_allow_loose := false;

    IF v_variant_id IS NOT NULL THEN
      SELECT pv.product_id, pv.inventory_id INTO v_product_id, v_inventory_id
      FROM public.product_variants pv WHERE pv.id = v_variant_id FOR UPDATE;
    END IF;

    IF v_inventory_id IS NOT NULL THEN
      SELECT quantity, purchase_price, purchase_price_per_base_unit, base_unit,
             package_size, base_quantity, allow_loose_sale
      INTO v_available, v_purchase_cost, v_purchase_cost_per_base, v_base_unit,
           v_package_size, v_base_available, v_allow_loose
      FROM public.inventory_items WHERE id = v_inventory_id FOR UPDATE;

      IF v_available IS NULL THEN RAISE EXCEPTION 'Inventory item not found for %', v_product_name; END IF;

      v_package_size := GREATEST(COALESCE(v_package_size, 1), 0.000001);
      v_base_available := GREATEST(COALESCE(v_base_available, v_available * v_package_size), 0);
      v_base_unit := COALESCE(NULLIF(trim(v_base_unit), ''), v_sale_unit);

      IF v_allow_loose THEN
        v_base_qty := public.convert_unit_quantity(v_qty, v_sale_unit, v_base_unit);
        IF v_base_qty <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero for %', v_product_name; END IF;
        IF v_base_available < v_base_qty THEN
          RAISE EXCEPTION 'Insufficient stock for %: available % %, requested % %',
            v_product_name, round(v_base_available, 6), v_base_unit, round(v_base_qty, 6), v_base_unit;
        END IF;
        v_item_amount := round(v_base_qty * v_rate, 2);
      ELSE
        IF v_available < v_qty THEN
          RAISE EXCEPTION 'Insufficient stock for %: available %, requested %', v_product_name, v_available, v_qty;
        END IF;
        v_base_qty := round(v_qty * v_package_size, 6);
        v_item_amount := round(v_qty * v_rate, 2);
      END IF;
    ELSIF v_product_id IS NOT NULL THEN
      SELECT inventory_id INTO v_inventory_id FROM public.products WHERE id = v_product_id FOR UPDATE;
      IF v_inventory_id IS NOT NULL THEN
        SELECT quantity, purchase_price, purchase_price_per_base_unit, base_unit,
               package_size, base_quantity, allow_loose_sale
        INTO v_available, v_purchase_cost, v_purchase_cost_per_base, v_base_unit,
             v_package_size, v_base_available, v_allow_loose
        FROM public.inventory_items WHERE id = v_inventory_id FOR UPDATE;

        v_package_size := GREATEST(COALESCE(v_package_size, 1), 0.000001);
        v_base_available := GREATEST(COALESCE(v_base_available, v_available * v_package_size), 0);
        v_base_unit := COALESCE(NULLIF(trim(v_base_unit), ''), v_sale_unit);

        IF v_allow_loose THEN
          v_base_qty := public.convert_unit_quantity(v_qty, v_sale_unit, v_base_unit);
          IF v_base_available < v_base_qty THEN
            RAISE EXCEPTION 'Insufficient stock for %: available % %, requested % %',
              v_product_name, round(v_base_available, 6), v_base_unit, round(v_base_qty, 6), v_base_unit;
          END IF;
          v_item_amount := round(v_base_qty * v_rate, 2);
        ELSE
          IF v_available < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for %: available %, requested %', v_product_name, v_available, v_qty;
          END IF;
          v_base_qty := round(v_qty * v_package_size, 6);
          v_item_amount := round(v_qty * v_rate, 2);
        END IF;
      ELSE
        SELECT stock INTO v_available FROM public.products WHERE id = v_product_id FOR UPDATE;
        IF v_available IS NULL OR v_available < v_qty THEN
          RAISE EXCEPTION 'Insufficient stock for %: available %, requested %', v_product_name, COALESCE(v_available, 0), v_qty;
        END IF;
        v_base_qty := v_qty; v_base_unit := v_sale_unit; v_item_amount := round(v_qty * v_rate, 2);
      END IF;
    ELSE
      v_base_qty := v_qty; v_base_unit := v_sale_unit; v_item_amount := round(v_qty * v_rate, 2);
    END IF;

    v_subtotal := v_subtotal + v_item_amount;
    v_item_count := v_item_count + 1;
  END LOOP;

  IF v_bargaining > v_subtotal THEN
    RAISE EXCEPTION 'Bargaining amount (%) cannot exceed sale subtotal (%)', v_bargaining, v_subtotal;
  END IF;
  v_final_total := round(v_subtotal - v_bargaining, 2);
  IF _paid > v_final_total THEN
    RAISE EXCEPTION 'Paid amount (%) cannot exceed final sale total (%)', _paid, v_final_total;
  END IF;

  SELECT COALESCE(NULLIF(x->>'product',''), 'Item') INTO v_summary
  FROM jsonb_array_elements(_items) AS x LIMIT 1;
  IF v_item_count > 1 THEN v_summary := v_summary || ' + ' || (v_item_count - 1) || ' more'; END IF;

  INSERT INTO public.customer_transactions
    (customer_id, entry_date, entry_type, product, quantity, subtotal, discount_amount, amount, payment, method, remarks)
  VALUES
    (_customer_id, COALESCE(_entry_date, current_date), 'sale', v_summary, v_item_count,
     v_subtotal, v_bargaining, v_final_total, _paid, COALESCE(_method, 'cash'), _remarks)
  RETURNING id INTO v_tx_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::numeric;
    v_rate := (v_item->>'rate')::numeric;
    v_sale_unit := COALESCE(NULLIF(trim(v_item->>'unit'), ''), 'unit');
    v_product_name := COALESCE(NULLIF(v_item->>'product', ''), 'Item');
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::uuid;
    v_variant_id := NULLIF(v_item->>'product_variant_id', '')::uuid;
    v_purchase_cost := 0; v_purchase_cost_per_base := 0; v_base_qty := NULL; v_base_unit := NULL;
    v_package_size := 1; v_allow_loose := false;

    IF v_variant_id IS NOT NULL THEN
      SELECT pv.product_id, pv.inventory_id, pv.label
      INTO v_product_id, v_inventory_id, v_base_unit
      FROM public.product_variants pv WHERE pv.id = v_variant_id;
      v_sale_unit := COALESCE(NULLIF(trim(v_item->>'unit'), ''), v_base_unit, 'unit');
    END IF;

    IF v_inventory_id IS NOT NULL THEN
      SELECT purchase_price, purchase_price_per_base_unit, base_unit, package_size, base_quantity, allow_loose_sale
      INTO v_purchase_cost, v_purchase_cost_per_base, v_base_unit, v_package_size, v_base_available, v_allow_loose
      FROM public.inventory_items WHERE id = v_inventory_id;
      v_package_size := GREATEST(COALESCE(v_package_size, 1), 0.000001);
      v_base_unit := COALESCE(NULLIF(trim(v_base_unit), ''), v_sale_unit);
      IF v_allow_loose THEN v_base_qty := public.convert_unit_quantity(v_qty, v_sale_unit, v_base_unit);
      ELSE v_base_qty := round(v_qty * v_package_size, 6); END IF;
    ELSIF v_product_id IS NOT NULL THEN
      SELECT ii.purchase_price, ii.purchase_price_per_base_unit, ii.base_unit, ii.package_size
      INTO v_purchase_cost, v_purchase_cost_per_base, v_base_unit, v_package_size
      FROM public.products p LEFT JOIN public.inventory_items ii ON ii.id = p.inventory_id
      WHERE p.id = v_product_id;
      v_package_size := GREATEST(COALESCE(v_package_size, 1), 0.000001);
      v_base_unit := COALESCE(NULLIF(trim(v_base_unit), ''), v_sale_unit);
      v_base_qty := round(v_qty * v_package_size, 6);
    ELSE
      v_base_qty := v_qty; v_base_unit := v_sale_unit;
    END IF;

    v_item_amount := CASE WHEN v_allow_loose THEN round(v_base_qty * v_rate, 2) ELSE round(v_qty * v_rate, 2) END;

    INSERT INTO public.customer_transaction_items
      (transaction_id, product_id, product_variant_id, product, quantity, unit, rate, amount,
       purchase_cost, admin_price_inc, entered_quantity, entered_unit, base_quantity, base_unit,
       purchase_cost_per_base_unit, selling_rate_per_base_unit, calculated_amount, final_sale_amount)
    VALUES
      (v_tx_id, v_product_id, v_variant_id, v_product_name, v_qty, v_sale_unit, v_rate, v_item_amount,
       COALESCE(v_purchase_cost, 0), v_rate, v_qty, v_sale_unit, v_base_qty, v_base_unit,
       COALESCE(v_purchase_cost_per_base, 0),
       CASE WHEN v_allow_loose THEN v_rate ELSE round(v_rate / v_package_size, 6) END,
       v_item_amount, v_item_amount);

    IF v_inventory_id IS NOT NULL THEN
      IF v_allow_loose THEN
        SELECT GREATEST(COALESCE(base_quantity, quantity * GREATEST(COALESCE(package_size, 1), 0.000001)), 0) - v_base_qty
        INTO v_new_base FROM public.inventory_items WHERE id = v_inventory_id FOR UPDATE;

        UPDATE public.inventory_items
        SET base_quantity = round(GREATEST(v_new_base, 0), 6),
            quantity = round(GREATEST(v_new_base, 0) / GREATEST(COALESCE(package_size, 1), 0.000001), 6),
            last_updated = current_date,
            status = CASE WHEN GREATEST(v_new_base, 0) <= 0 THEN 'out-of-stock' ELSE 'in-stock' END
        WHERE id = v_inventory_id;
      ELSE
        UPDATE public.inventory_items
        SET quantity = quantity - v_qty,
            base_quantity = CASE WHEN base_quantity IS NULL THEN NULL ELSE round(GREATEST(base_quantity - v_base_qty, 0), 6) END,
            last_updated = current_date,
            status = CASE WHEN quantity - v_qty <= 0 THEN 'out-of-stock' ELSE status END
        WHERE id = v_inventory_id;
      END IF;

      IF v_product_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET stock = (SELECT quantity FROM public.inventory_items WHERE id = v_inventory_id),
            base_stock = COALESCE((SELECT base_quantity FROM public.inventory_items WHERE id = v_inventory_id),
                                  (SELECT quantity FROM public.inventory_items WHERE id = v_inventory_id)),
            updated_at = now()
        WHERE id = v_variant_id OR inventory_id = v_inventory_id;

        UPDATE public.products
        SET stock = COALESCE((SELECT SUM(pv.stock) FROM public.product_variants pv WHERE pv.product_id = v_product_id), 0),
            updated_at = now()
        WHERE id = v_product_id;
      END IF;
    ELSIF v_product_id IS NOT NULL THEN
      UPDATE public.products SET stock = stock - v_qty, updated_at = now() WHERE id = v_product_id;
    END IF;
  END LOOP;

  RETURN v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_khata_sale_with_bargaining(uuid, jsonb, numeric, numeric, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_khata_sale_with_bargaining(uuid, jsonb, numeric, numeric, text, date, text) TO authenticated;
