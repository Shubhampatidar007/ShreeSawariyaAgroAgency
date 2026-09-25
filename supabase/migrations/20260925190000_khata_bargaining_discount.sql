-- Invoice-level bargaining for New Khata Sale.
-- Item selling-rate snapshots remain unchanged; the negotiated amount is stored once on the sale header.

ALTER TABLE public.customer_transactions
  ADD COLUMN IF NOT EXISTS subtotal numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(14,2) NOT NULL DEFAULT 0;

UPDATE public.customer_transactions
SET subtotal = amount,
    discount_amount = 0
WHERE subtotal = 0
  AND amount <> 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_transactions_subtotal_nonneg'
  ) THEN
    ALTER TABLE public.customer_transactions
      ADD CONSTRAINT customer_transactions_subtotal_nonneg CHECK (subtotal >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_transactions_discount_nonneg'
  ) THEN
    ALTER TABLE public.customer_transactions
      ADD CONSTRAINT customer_transactions_discount_nonneg CHECK (discount_amount >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_transactions_discount_le_subtotal'
  ) THEN
    ALTER TABLE public.customer_transactions
      ADD CONSTRAINT customer_transactions_discount_le_subtotal CHECK (discount_amount <= subtotal);
  END IF;
END $$;

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
  v_unit text;
  v_inventory_id uuid;
  v_purchase_cost numeric;
  v_available numeric;
  v_subtotal numeric := 0;
  v_bargaining numeric := COALESCE(_bargaining_amount, 0);
  v_final_total numeric := 0;
  v_item_count int := 0;
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
  IF _paid IS NULL OR _paid < 0 THEN
    RAISE EXCEPTION 'Paid amount cannot be negative';
  END IF;
  IF v_bargaining < 0 THEN
    RAISE EXCEPTION 'Bargaining amount cannot be negative';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    v_rate := COALESCE((v_item->>'rate')::numeric, 0);
    v_product_name := COALESCE(NULLIF(v_item->>'product', ''), 'Item');
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::uuid;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantity must be greater than zero for %', v_product_name;
    END IF;
    IF v_rate < 0 THEN
      RAISE EXCEPTION 'Selling price cannot be negative for %', v_product_name;
    END IF;

    IF v_inventory_id IS NOT NULL THEN
      SELECT quantity, purchase_price INTO v_available, v_purchase_cost
      FROM public.inventory_items WHERE id = v_inventory_id FOR UPDATE;
    ELSIF v_product_id IS NOT NULL THEN
      SELECT inventory_id INTO v_inventory_id
      FROM public.products WHERE id = v_product_id FOR UPDATE;
      IF v_inventory_id IS NOT NULL THEN
        SELECT quantity, purchase_price INTO v_available, v_purchase_cost
        FROM public.inventory_items WHERE id = v_inventory_id FOR UPDATE;
      ELSE
        SELECT stock INTO v_available
        FROM public.products WHERE id = v_product_id FOR UPDATE;
        v_purchase_cost := 0;
      END IF;
    ELSE
      v_available := NULL;
      v_purchase_cost := 0;
    END IF;

    IF v_inventory_id IS NOT NULL AND (v_available IS NULL OR v_available < v_qty) THEN
      RAISE EXCEPTION 'Insufficient stock for %: available %, requested %',
        v_product_name, COALESCE(v_available, 0), v_qty;
    END IF;
    IF v_product_id IS NOT NULL AND v_inventory_id IS NULL
       AND (v_available IS NULL OR v_available < v_qty) THEN
      RAISE EXCEPTION 'Insufficient stock for %: available %, requested %',
        v_product_name, COALESCE(v_available, 0), v_qty;
    END IF;

    v_subtotal := v_subtotal + (v_qty * v_rate);
    v_item_count := v_item_count + 1;
  END LOOP;

  IF v_bargaining > v_subtotal THEN
    RAISE EXCEPTION 'Bargaining amount (%) cannot exceed sale subtotal (%)',
      v_bargaining, v_subtotal;
  END IF;
  v_final_total := v_subtotal - v_bargaining;

  IF _paid > v_final_total THEN
    RAISE EXCEPTION 'Paid amount (%) cannot exceed final sale total (%)',
      _paid, v_final_total;
  END IF;

  SELECT COALESCE(NULLIF(x->>'product', ''), 'Item') INTO v_summary
  FROM jsonb_array_elements(_items) AS x LIMIT 1;
  IF v_item_count > 1 THEN
    v_summary := v_summary || ' + ' || (v_item_count - 1) || ' more';
  END IF;

  INSERT INTO public.customer_transactions
    (customer_id, entry_date, entry_type, product, quantity, subtotal, discount_amount,
     amount, payment, method, remarks)
  VALUES
    (_customer_id, COALESCE(_entry_date, current_date), 'sale', v_summary, v_item_count,
     v_subtotal, v_bargaining, v_final_total, _paid, COALESCE(_method, 'cash'), _remarks)
  RETURNING id INTO v_tx_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::numeric;
    v_rate := (v_item->>'rate')::numeric;
    v_unit := COALESCE(NULLIF(v_item->>'unit', ''), 'unit');
    v_product_name := COALESCE(NULLIF(v_item->>'product', ''), 'Item');
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::uuid;
    v_purchase_cost := 0;

    IF v_inventory_id IS NOT NULL THEN
      SELECT purchase_price INTO v_purchase_cost
      FROM public.inventory_items WHERE id = v_inventory_id;
    ELSIF v_product_id IS NOT NULL THEN
      SELECT ii.purchase_price INTO v_purchase_cost
      FROM public.products p
      LEFT JOIN public.inventory_items ii ON ii.id = p.inventory_id
      WHERE p.id = v_product_id;
      v_purchase_cost := COALESCE(v_purchase_cost, 0);
    END IF;

    INSERT INTO public.customer_transaction_items
      (transaction_id, product_id, product, quantity, unit, rate, purchase_cost, admin_price_inc)
    VALUES
      (v_tx_id, v_product_id, v_product_name, v_qty, v_unit, v_rate, v_purchase_cost, v_rate);

    IF v_inventory_id IS NOT NULL THEN
      UPDATE public.inventory_items
      SET quantity = quantity - v_qty,
          last_updated = current_date,
          status = CASE WHEN quantity - v_qty <= 0 THEN 'out-of-stock' ELSE status END
      WHERE id = v_inventory_id;

      IF v_product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock = COALESCE((
          SELECT SUM(pv.stock) FROM public.product_variants pv WHERE pv.product_id = v_product_id
        ), 0),
        updated_at = now()
        WHERE id = v_product_id;
      END IF;
    ELSIF v_product_id IS NOT NULL THEN
      SELECT inventory_id INTO v_inventory_id
      FROM public.products WHERE id = v_product_id;
      IF v_inventory_id IS NOT NULL THEN
        UPDATE public.inventory_items
        SET quantity = quantity - v_qty,
            last_updated = current_date,
            status = CASE WHEN quantity - v_qty <= 0 THEN 'out-of-stock' ELSE status END
        WHERE id = v_inventory_id;
      ELSE
        UPDATE public.products SET stock = stock - v_qty, updated_at = now()
        WHERE id = v_product_id;
      END IF;
    END IF;
  END LOOP;

  RETURN v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_khata_sale_with_bargaining(uuid, jsonb, numeric, numeric, text, date, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_khata_sale_with_bargaining(uuid, jsonb, numeric, numeric, text, date, text)
  TO authenticated;
