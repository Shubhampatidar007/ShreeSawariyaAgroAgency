-- Resolve every Khata sale line to stable product + variant identities.
-- Custom items are created as hidden draft products/variants at save time.
-- They are intentionally not added to inventory because no stock receipt exists.

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
  v_variant_id uuid;
  v_inventory_id uuid;
  v_product_name text;
  v_qty numeric;
  v_rate numeric;
  v_unit text;
  v_available numeric;
  v_purchase_cost numeric;
  v_subtotal numeric := 0;
  v_bargaining numeric := COALESCE(_bargaining_amount, 0);
  v_final_total numeric := 0;
  v_item_count integer := 0;
  v_tx_id uuid;
  v_summary text;
  v_stock_managed boolean;
  v_created_product boolean;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.customers WHERE id = _customer_id
  ) THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF _items IS NULL
     OR jsonb_typeof(_items) <> 'array'
     OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;

  IF _paid IS NULL OR _paid < 0 THEN
    RAISE EXCEPTION 'Paid amount cannot be negative';
  END IF;

  IF v_bargaining < 0 THEN
    RAISE EXCEPTION 'Bargaining amount cannot be negative';
  END IF;

  /*
   * First pass:
   * validate every line, resolve an existing identity where possible,
   * create missing product/variant identities when necessary, and calculate
   * the sale subtotal from the exact item quantity × rate values.
   */
  FOR v_item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    v_product_name := COALESCE(NULLIF(trim(v_item->>'product'), ''), 'Item');
    v_qty := COALESCE(NULLIF(v_item->>'quantity', '')::numeric, 0);
    v_rate := COALESCE(NULLIF(v_item->>'rate', '')::numeric, 0);
    v_unit := COALESCE(NULLIF(trim(v_item->>'unit'), ''), 'unit');

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantity must be greater than zero for %', v_product_name;
    END IF;

    IF v_rate < 0 THEN
      RAISE EXCEPTION 'Selling price cannot be negative for %', v_product_name;
    END IF;

    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_variant_id := NULLIF(v_item->>'product_variant_id', '')::uuid;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::uuid;
    v_purchase_cost := 0;
    v_created_product := false;

    /*
     * A supplied variant is the strongest identity. Pull its linked product
     * and inventory so all three references stay consistent.
     */
    IF v_variant_id IS NOT NULL THEN
      SELECT pv.product_id, pv.inventory_id, pv.stock, pv.label
      INTO v_product_id, v_inventory_id, v_available, v_unit
      FROM public.product_variants pv
      WHERE pv.id = v_variant_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product variant not found for %', v_product_name;
      END IF;
    END IF;

    /*
     * Resolve inventory -> product when the caller supplied inventory only.
     */
    IF v_product_id IS NULL AND v_inventory_id IS NOT NULL THEN
      SELECT p.id
      INTO v_product_id
      FROM public.products p
      WHERE p.inventory_id = v_inventory_id
      ORDER BY CASE WHEN p.status = 'published' THEN 0 ELSE 1 END, p.created_at
      LIMIT 1
      FOR UPDATE;
    END IF;

    /*
     * Resolve product -> inventory when the caller supplied product only.
     */
    IF v_inventory_id IS NULL AND v_product_id IS NOT NULL THEN
      SELECT p.inventory_id
      INTO v_inventory_id
      FROM public.products p
      WHERE p.id = v_product_id
      FOR UPDATE;
    END IF;

    /*
     * If a product identity is still missing, create one now.
     *
     * Inventory-backed line:
     *   create a hidden draft product linked to the inventory.
     *
     * True custom line:
     *   reuse the latest hidden draft product with the same name, or create it.
     *   No fake inventory quantity is created for a custom line.
     */
    IF v_product_id IS NULL THEN
      v_created_product := true;

      IF v_inventory_id IS NOT NULL THEN
        INSERT INTO public.products (
          inventory_id,
          title,
          category,
          selling_price,
          discount_price,
          stock,
          description,
          tags,
          images,
          emoji,
          visibility,
          featured,
          status,
          published_on
        )
        SELECT
          i.id,
          v_product_name,
          'General',
          v_rate,
          NULL,
          GREATEST(i.quantity, 0),
          '',
          ARRAY[]::text[],
          ARRAY[]::text[],
          '🌾',
          'hidden',
          false,
          'draft',
          current_date
        FROM public.inventory_items i
        WHERE i.id = v_inventory_id
        RETURNING id INTO v_product_id;

        IF v_product_id IS NULL THEN
          RAISE EXCEPTION 'Inventory item not found for %', v_product_name;
        END IF;
      ELSE
        SELECT p.id
        INTO v_product_id
        FROM public.products p
        WHERE lower(trim(p.title)) = lower(trim(v_product_name))
          AND p.visibility = 'hidden'
          AND p.status = 'draft'
        ORDER BY p.created_at DESC
        LIMIT 1
        FOR UPDATE;

        IF v_product_id IS NULL THEN
          INSERT INTO public.products (
            inventory_id,
            title,
            category,
            selling_price,
            discount_price,
            stock,
            description,
            tags,
            images,
            emoji,
            visibility,
            featured,
            status,
            published_on
          )
          VALUES (
            NULL,
            v_product_name,
            'Custom',
            v_rate,
            NULL,
            0,
            'Custom item created from Khata sale.',
            ARRAY[]::text[],
            ARRAY[]::text[],
            '📦',
            'hidden',
            false,
            'draft',
            current_date
          )
          RETURNING id INTO v_product_id;
        END IF;
      END IF;
    ELSE
      v_created_product := false;
    END IF;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Could not resolve product identity for %', v_product_name;
    END IF;

    /*
     * A true custom line uses a hidden draft product with no inventory.
     * Keep that identity's displayed price synchronized with the price used
     * on this transaction without touching published catalogue products.
     */
    IF v_inventory_id IS NULL
       AND NULLIF(v_item->>'product_id', '') IS NULL
       AND NULLIF(v_item->>'product_variant_id', '') IS NULL THEN
      UPDATE public.products
      SET selling_price = v_rate,
          updated_at = now()
      WHERE id = v_product_id
        AND visibility = 'hidden'
        AND status = 'draft';
    END IF;

    /*
     * Pull purchase cost from inventory when available.
     */
    IF v_inventory_id IS NOT NULL THEN
      SELECT quantity, purchase_price
      INTO v_available, v_purchase_cost
      FROM public.inventory_items
      WHERE id = v_inventory_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item not found for %', v_product_name;
      END IF;
    ELSE
      v_purchase_cost := 0;
    END IF;

    /*
     * Existing stock-backed items must have enough stock.
     * A newly-created/reused custom draft product without inventory is not
     * stock-backed, so no artificial inventory/stock is manufactured.
     */
    v_stock_managed :=
      v_inventory_id IS NOT NULL
      OR NULLIF(v_item->>'product_id', '') IS NOT NULL
      OR (NULLIF(v_item->>'product_variant_id', '') IS NOT NULL
          AND v_created_product = false);

    IF v_inventory_id IS NOT NULL THEN
      IF v_available < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for %: available %, requested %',
          v_product_name, v_available, v_qty;
      END IF;
    ELSIF v_stock_managed
          AND NULLIF(v_item->>'product_id', '') IS NOT NULL THEN
      SELECT stock
      INTO v_available
      FROM public.products
      WHERE id = v_product_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found for %', v_product_name;
      END IF;

      IF v_available < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for %: available %, requested %',
          v_product_name, v_available, v_qty;
      END IF;
    END IF;

    /*
     * Resolve/create the variant identity. For inventory-backed products,
     * keep the variant attached to the inventory. For custom products,
     * the variant exists without fabricated stock.
     */
    IF v_variant_id IS NULL THEN
      SELECT pv.id
      INTO v_variant_id
      FROM public.product_variants pv
      WHERE pv.product_id = v_product_id
        AND lower(trim(pv.label)) = lower(trim(v_unit))
      ORDER BY CASE WHEN pv.inventory_id = v_inventory_id THEN 0 ELSE 1 END, pv.created_at
      LIMIT 1
      FOR UPDATE;
    END IF;

    IF v_variant_id IS NULL THEN
      INSERT INTO public.product_variants (
        product_id,
        inventory_id,
        label,
        selling_price,
        discount_price,
        stock
      )
      VALUES (
        v_product_id,
        v_inventory_id,
        v_unit,
        v_rate,
        NULL,
        CASE
          WHEN v_inventory_id IS NOT NULL THEN GREATEST(v_available, 0)
          ELSE 0
        END
      )
      RETURNING id INTO v_variant_id;
    ELSE
      IF v_inventory_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET product_id = v_product_id,
            inventory_id = v_inventory_id,
            updated_at = now()
        WHERE id = v_variant_id;
      END IF;
    END IF;

    IF v_variant_id IS NULL THEN
      RAISE EXCEPTION 'Could not resolve product variant for %', v_product_name;
    END IF;

    IF v_inventory_id IS NOT NULL THEN
      UPDATE public.inventory_items
      SET product_variant_id = v_variant_id
      WHERE id = v_inventory_id;
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

  SELECT COALESCE(NULLIF(x->>'product', ''), 'Item')
  INTO v_summary
  FROM jsonb_array_elements(_items) AS x
  LIMIT 1;

  IF v_item_count > 1 THEN
    v_summary := v_summary || ' + ' || (v_item_count - 1) || ' more';
  END IF;

  /*
   * Header row. The existing customer transaction trigger updates the
   * customer's running due and, when payment > 0, writes the matching
   * incoming payment row.
   */
  INSERT INTO public.customer_transactions (
    customer_id,
    entry_date,
    entry_type,
    product,
    quantity,
    subtotal,
    discount_amount,
    amount,
    payment,
    method,
    remarks
  )
  VALUES (
    _customer_id,
    COALESCE(_entry_date, current_date),
    'sale',
    v_summary,
    v_item_count,
    v_subtotal,
    v_bargaining,
    v_final_total,
    _paid,
    COALESCE(_method, 'cash'),
    _remarks
  )
  RETURNING id INTO v_tx_id;

  /*
   * Second pass: insert fully-linked transaction lines and update stock.
   */
  FOR v_item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    v_product_name := COALESCE(NULLIF(trim(v_item->>'product'), ''), 'Item');
    v_qty := COALESCE(NULLIF(v_item->>'quantity', '')::numeric, 0);
    v_rate := COALESCE(NULLIF(v_item->>'rate', '')::numeric, 0);
    v_unit := COALESCE(NULLIF(trim(v_item->>'unit'), ''), 'unit');

    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_variant_id := NULLIF(v_item->>'product_variant_id', '')::uuid;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::uuid;

    IF v_variant_id IS NOT NULL THEN
      SELECT pv.product_id, pv.inventory_id, pv.label
      INTO v_product_id, v_inventory_id, v_unit
      FROM public.product_variants pv
      WHERE pv.id = v_variant_id
      FOR UPDATE;
    END IF;

    IF v_product_id IS NULL AND v_inventory_id IS NOT NULL THEN
      SELECT p.id
      INTO v_product_id
      FROM public.products p
      WHERE p.inventory_id = v_inventory_id
      ORDER BY CASE WHEN p.status = 'published' THEN 0 ELSE 1 END, p.created_at
      LIMIT 1
      FOR UPDATE;
    END IF;

    IF v_product_id IS NULL THEN
      SELECT p.id
      INTO v_product_id
      FROM public.products p
      WHERE lower(trim(p.title)) = lower(trim(v_product_name))
        AND p.visibility = 'hidden'
        AND p.status = 'draft'
      ORDER BY p.created_at DESC
      LIMIT 1
      FOR UPDATE;
    END IF;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Product identity could not be resolved for %', v_product_name;
    END IF;

    IF v_variant_id IS NULL THEN
      SELECT pv.id
      INTO v_variant_id
      FROM public.product_variants pv
      WHERE pv.product_id = v_product_id
        AND lower(trim(pv.label)) = lower(trim(v_unit))
      ORDER BY pv.created_at DESC
      LIMIT 1
      FOR UPDATE;
    END IF;

    IF v_variant_id IS NULL THEN
      RAISE EXCEPTION 'Product variant identity could not be resolved for %', v_product_name;
    END IF;

    IF v_inventory_id IS NULL
       AND NULLIF(v_item->>'product_id', '') IS NULL
       AND NULLIF(v_item->>'product_variant_id', '') IS NULL THEN
      UPDATE public.product_variants
      SET selling_price = v_rate,
          updated_at = now()
      WHERE id = v_variant_id
        AND product_id = v_product_id;
    END IF;

    IF v_inventory_id IS NOT NULL THEN
      SELECT purchase_price
      INTO v_purchase_cost
      FROM public.inventory_items
      WHERE id = v_inventory_id
      FOR UPDATE;
      v_purchase_cost := COALESCE(v_purchase_cost, 0);
    ELSE
      v_purchase_cost := 0;
    END IF;

    INSERT INTO public.customer_transaction_items (
      transaction_id,
      product_id,
      product_variant_id,
      product,
      quantity,
      unit,
      rate,
      purchase_cost,
      admin_price_inc
    )
    VALUES (
      v_tx_id,
      v_product_id,
      v_variant_id,
      v_product_name,
      v_qty,
      v_unit,
      v_rate,
      v_purchase_cost,
      v_rate
    );

    IF v_inventory_id IS NOT NULL THEN
      UPDATE public.inventory_items
      SET quantity = quantity - v_qty,
          last_updated = current_date,
          status = CASE
            WHEN quantity - v_qty <= 0 THEN 'out-of-stock'
            ELSE status
          END
      WHERE id = v_inventory_id;

      UPDATE public.products
      SET stock = (
        SELECT COALESCE(SUM(pv.stock), 0)
        FROM public.product_variants pv
        WHERE pv.product_id = v_product_id
      ),
      updated_at = now()
      WHERE id = v_product_id;
    ELSIF NULLIF(v_item->>'product_id', '') IS NOT NULL THEN
      UPDATE public.product_variants
      SET stock = GREATEST(stock - v_qty, 0),
          updated_at = now()
      WHERE id = v_variant_id;

      UPDATE public.products
      SET stock = (
        SELECT COALESCE(SUM(pv.stock), 0)
        FROM public.product_variants pv
        WHERE pv.product_id = v_product_id
      ),
      updated_at = now()
      WHERE id = v_product_id;
    END IF;
  END LOOP;

  /*
   * Keep product stock synchronized for every affected identity.
   * Custom products remain at zero stock because they have no inventory.
   */
  UPDATE public.products p
  SET stock = (
    SELECT COALESCE(SUM(pv.stock), 0)
    FROM public.product_variants pv
    WHERE pv.product_id = p.id
  ),
  updated_at = now()
  WHERE p.id IN (
    SELECT DISTINCT NULLIF(x->>'product_id', '')::uuid
    FROM jsonb_array_elements(_items) AS x
    WHERE NULLIF(x->>'product_id', '') IS NOT NULL
  );

  RETURN v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_khata_sale_with_bargaining(uuid, jsonb, numeric, numeric, text, date, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_khata_sale_with_bargaining(uuid, jsonb, numeric, numeric, text, date, text)
  TO authenticated;
