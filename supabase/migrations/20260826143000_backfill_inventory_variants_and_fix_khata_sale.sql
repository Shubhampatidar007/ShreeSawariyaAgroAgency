-- Backfill legacy inventory rows that predate product-variant creation.
-- This keeps New Khata Sale inventory-backed without requiring those rows to be published.
DO $$
DECLARE
  v_item record;
  v_product_id uuid;
  v_variant_id uuid;
BEGIN
  FOR v_item IN
    SELECT *
    FROM public.inventory_items
    WHERE product_variant_id IS NULL
    ORDER BY product_name, id
  LOOP
    v_product_id := NULL;
    v_variant_id := NULL;

    SELECT id INTO v_product_id
    FROM public.products
    WHERE inventory_id = v_item.id
    LIMIT 1
    FOR UPDATE;

    IF v_product_id IS NULL THEN
      SELECT id INTO v_product_id
      FROM public.products
      WHERE lower(trim(title)) = lower(trim(v_item.product_name))
        AND status <> 'archived'
      ORDER BY CASE WHEN status = 'published' THEN 0 ELSE 1 END, created_at
      LIMIT 1
      FOR UPDATE;
    END IF;

    IF v_product_id IS NULL THEN
      INSERT INTO public.products (
        inventory_id, title, category, selling_price, discount_price, stock,
        description, tags, images, emoji, visibility, featured, status, published_on
      )
      VALUES (
        v_item.id, v_item.product_name, 'Inventory', coalesce(v_item.purchase_price, 0), NULL,
        greatest(coalesce(v_item.quantity, 0), 0), '', array[]::text[], array[]::text[],
        '🌾', 'hidden', false, 'draft', current_date
      )
      RETURNING id INTO v_product_id;
    END IF;

    SELECT id INTO v_variant_id
    FROM public.product_variants
    WHERE inventory_id = v_item.id
    LIMIT 1
    FOR UPDATE;

    IF v_variant_id IS NULL THEN
      INSERT INTO public.product_variants (
        product_id, inventory_id, label, selling_price, stock, status
      )
      VALUES (
        v_product_id, v_item.id, coalesce(nullif(trim(v_item.unit), ''), 'unit'),
        greatest(coalesce(v_item.purchase_price, 0), 0),
        greatest(coalesce(v_item.quantity, 0), 0), 'active'
      )
      RETURNING id INTO v_variant_id;
    ELSE
      UPDATE public.product_variants
      SET product_id = v_product_id,
          label = coalesce(nullif(trim(v_item.unit), ''), 'unit'),
          selling_price = greatest(coalesce(v_item.purchase_price, selling_price, 0), 0),
          stock = greatest(coalesce(v_item.quantity, 0), 0),
          status = 'active',
          updated_at = now()
      WHERE id = v_variant_id;
    END IF;

    UPDATE public.inventory_items
    SET product_variant_id = v_variant_id
    WHERE id = v_item.id;
  END LOOP;

  UPDATE public.products p
  SET stock = coalesce((
    SELECT sum(pv.stock)
    FROM public.product_variants pv
    WHERE pv.product_id = p.id
  ), 0),
      updated_at = now()
  WHERE EXISTS (
    SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id
  );
END;
$$;

-- Make Khata Sale inventory-aware so a selected variant decrements the exact inventory row.
CREATE OR REPLACE FUNCTION public.create_khata_sale(
  _customer_id uuid,
  _items jsonb,
  _paid numeric DEFAULT 0,
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
  v_available numeric;
  v_total numeric := 0;
  v_item_count int := 0;
  v_tx_id uuid;
  v_summary text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = _customer_id) THEN RAISE EXCEPTION 'Customer not found'; END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'At least one item is required'; END IF;
  IF _paid IS NULL OR _paid < 0 THEN RAISE EXCEPTION 'Paid amount cannot be negative'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    v_rate := COALESCE((v_item->>'rate')::numeric, 0);
    v_product_name := COALESCE(NULLIF(v_item->>'product', ''), 'Item');
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::uuid;

    IF v_qty <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero for %', v_product_name; END IF;
    IF v_rate < 0 THEN RAISE EXCEPTION 'Selling price cannot be negative for %', v_product_name; END IF;

    IF v_inventory_id IS NOT NULL THEN
      SELECT quantity INTO v_available FROM public.inventory_items WHERE id = v_inventory_id FOR UPDATE;
      IF v_available IS NULL OR v_available < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for %: available %, requested %', v_product_name, COALESCE(v_available, 0), v_qty;
      END IF;
    ELSIF v_product_id IS NOT NULL THEN
      SELECT inventory_id INTO v_inventory_id FROM public.products WHERE id = v_product_id FOR UPDATE;
      IF v_inventory_id IS NOT NULL THEN
        SELECT quantity INTO v_available FROM public.inventory_items WHERE id = v_inventory_id FOR UPDATE;
      ELSE
        SELECT stock INTO v_available FROM public.products WHERE id = v_product_id FOR UPDATE;
      END IF;
      IF v_available IS NULL OR v_available < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for %: available %, requested %', v_product_name, COALESCE(v_available, 0), v_qty;
      END IF;
    END IF;

    v_total := v_total + (v_qty * v_rate);
    v_item_count := v_item_count + 1;
  END LOOP;

  IF _paid > v_total THEN RAISE EXCEPTION 'Paid amount (%) cannot exceed sale total (%)', _paid, v_total; END IF;

  SELECT COALESCE(NULLIF(x->>'product',''), 'Item') INTO v_summary
  FROM jsonb_array_elements(_items) AS x LIMIT 1;
  IF v_item_count > 1 THEN v_summary := v_summary || ' + ' || (v_item_count - 1) || ' more'; END IF;

  INSERT INTO public.customer_transactions
    (customer_id, entry_date, entry_type, product, quantity, amount, payment, method, remarks)
  VALUES
    (_customer_id, COALESCE(_entry_date, current_date), 'purchase', v_summary, v_item_count, v_total, _paid, COALESCE(_method,'cash'), _remarks)
  RETURNING id INTO v_tx_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::numeric;
    v_rate := (v_item->>'rate')::numeric;
    v_unit := COALESCE(NULLIF(v_item->>'unit',''), 'unit');
    v_product_name := COALESCE(NULLIF(v_item->>'product', ''), 'Item');
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::uuid;

    INSERT INTO public.customer_transaction_items
      (transaction_id, product_id, product, quantity, unit, rate)
    VALUES
      (v_tx_id, v_product_id, v_product_name, v_qty, v_unit, v_rate);

    IF v_inventory_id IS NOT NULL THEN
      UPDATE public.inventory_items
      SET quantity = quantity - v_qty,
          last_updated = current_date,
          status = CASE WHEN quantity - v_qty <= 0 THEN 'out-of-stock' ELSE status END
      WHERE id = v_inventory_id;

      IF v_product_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET stock = (SELECT quantity FROM public.inventory_items WHERE id = v_inventory_id), updated_at = now()
        WHERE inventory_id = v_inventory_id;
        UPDATE public.products
        SET stock = coalesce((SELECT sum(pv.stock) FROM public.product_variants pv WHERE pv.product_id = v_product_id), 0),
            updated_at = now()
        WHERE id = v_product_id;
      END IF;
    ELSIF v_product_id IS NOT NULL THEN
      SELECT inventory_id INTO v_inventory_id FROM public.products WHERE id = v_product_id;
      IF v_inventory_id IS NOT NULL THEN
        UPDATE public.inventory_items
        SET quantity = quantity - v_qty,
            last_updated = current_date,
            status = CASE WHEN quantity - v_qty <= 0 THEN 'out-of-stock' ELSE status END
        WHERE id = v_inventory_id;
        UPDATE public.product_variants
        SET stock = (SELECT quantity FROM public.inventory_items WHERE id = v_inventory_id), updated_at = now()
        WHERE inventory_id = v_inventory_id;
      ELSE
        UPDATE public.products SET stock = stock - v_qty, updated_at = now() WHERE id = v_product_id;
      END IF;
    END IF;
  END LOOP;

  RETURN v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_khata_sale(uuid, jsonb, numeric, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_khata_sale(uuid, jsonb, numeric, text, date, text) TO authenticated;
