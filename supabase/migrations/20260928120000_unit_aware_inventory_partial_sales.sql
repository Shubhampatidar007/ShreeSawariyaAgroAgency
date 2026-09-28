-- Unit-aware inventory and partial-quantity sales.
-- Safe additive migration: legacy quantity/unit/price columns and historical transactions remain intact.
-- New normalized fields become the source of truth for normalized inventory-backed sales.

-- The legacy quantity is retained as package count, but widened to 6 decimals so
-- partial sales of large packages (for example 350 g from a 50 kg bag = 0.007 pack)
-- do not lose physical-stock precision.
ALTER TABLE public.inventory_items
  ALTER COLUMN quantity TYPE numeric(20,6);

ALTER TABLE public.product_variants
  ALTER COLUMN stock TYPE numeric(20,6);

ALTER TABLE public.products
  ALTER COLUMN stock TYPE numeric(20,6);

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS base_unit text NOT NULL DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS package_size numeric(20,6) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_quantity numeric(20,6)
    GENERATED ALWAYS AS (round(quantity * package_size, 6)) STORED,
  ADD COLUMN IF NOT EXISTS allow_loose_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS purchase_price_per_base_unit numeric(20,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price_per_base_unit numeric(20,6);

ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_package_size_positive
    CHECK (package_size > 0),
  ADD CONSTRAINT inventory_items_purchase_base_price_nonnegative
    CHECK (purchase_price_per_base_unit >= 0),
  ADD CONSTRAINT inventory_items_selling_base_price_nonnegative
    CHECK (selling_price_per_base_unit IS NULL OR selling_price_per_base_unit >= 0);

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS base_stock numeric(20,6) NOT NULL DEFAULT 0;

ALTER TABLE public.customer_transaction_items
  ADD COLUMN IF NOT EXISTS entered_quantity numeric(20,6),
  ADD COLUMN IF NOT EXISTS entered_unit text,
  ADD COLUMN IF NOT EXISTS base_quantity numeric(20,6),
  ADD COLUMN IF NOT EXISTS base_unit text,
  ADD COLUMN IF NOT EXISTS purchase_cost_per_base_unit numeric(20,6),
  ADD COLUMN IF NOT EXISTS selling_rate_per_base_unit numeric(20,6),
  ADD COLUMN IF NOT EXISTS calculated_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS final_sale_amount numeric(14,2);

-- Normalize legacy inventory packaging without changing the legacy display columns.
-- Examples: "40 kg bag" -> base unit kg, package size 40; "bag" -> bag, package size 1.
UPDATE public.inventory_items
SET
  package_size = CASE
    WHEN regexp_match(
      lower(trim(unit)),
      '^([0-9]+(?:\.[0-9]+)?)\s*(g|gm|gram|grams|kg|kilogram|kilograms|q|quintal|quintals|t|ton|tons|tonne|tonnes|ml|millilitre|millilitres|milliliter|milliliters|l|lt|ltr|litre|litres|liter|liters)\b'
    ) IS NOT NULL
      THEN (regexp_match(
        lower(trim(unit)),
        '^([0-9]+(?:\.[0-9]+)?)\s*(g|gm|gram|grams|kg|kilogram|kilograms|q|quintal|quintals|t|ton|tons|tonne|tonnes|ml|millilitre|millilitres|milliliter|milliliters|l|lt|ltr|litre|litres|liter|liters)\b'
      ))[1]::numeric
    ELSE 1
  END,
  base_unit = CASE
    WHEN lower(trim(unit)) IN ('g','gm','gram','grams') THEN 'g'
    WHEN lower(trim(unit)) IN ('kg','kilo','kilos','kilogram','kilograms') THEN 'kg'
    WHEN lower(trim(unit)) IN ('q','quintal','quintals') THEN 'quintal'
    WHEN lower(trim(unit)) IN ('t','ton','tons','tonne','tonnes') THEN 'tonne'
    WHEN lower(trim(unit)) IN ('ml','millilitre','millilitres','milliliter','milliliters') THEN 'ml'
    WHEN lower(trim(unit)) IN ('l','lt','ltr','litre','litres','liter','liters') THEN 'l'
    WHEN lower(trim(unit)) IN ('piece','pieces','pc','pcs') THEN 'piece'
    WHEN lower(trim(unit)) IN ('box','boxes') THEN 'box'
    WHEN lower(trim(unit)) IN ('packet','packets','pack','packs') THEN 'packet'
    WHEN lower(trim(unit)) IN ('bag','bags') THEN 'bag'
    WHEN regexp_match(
      lower(trim(unit)),
      '^([0-9]+(?:\.[0-9]+)?)\s*(g|gm|gram|grams|kg|kilogram|kilograms|q|quintal|quintals|t|ton|tons|tonne|tonnes|ml|millilitre|millilitres|milliliter|milliliters|l|lt|ltr|litre|litres|liter|liters)\b'
    ) IS NOT NULL
      THEN CASE (regexp_match(
        lower(trim(unit)),
        '^([0-9]+(?:\.[0-9]+)?)\s*(g|gm|gram|grams|kg|kilogram|kilograms|q|quintal|quintals|t|ton|tons|tonne|tonnes|ml|millilitre|millilitres|milliliter|milliliters|l|lt|ltr|litre|litres|liter|liters)\b'
      ))[2]
        WHEN 'g' THEN 'g'
        WHEN 'gm' THEN 'g'
        WHEN 'gram' THEN 'g'
        WHEN 'grams' THEN 'g'
        WHEN 'kg' THEN 'kg'
        WHEN 'kilo' THEN 'kg'
        WHEN 'kilos' THEN 'kg'
        WHEN 'kilogram' THEN 'kg'
        WHEN 'kilograms' THEN 'kg'
        WHEN 'q' THEN 'quintal'
        WHEN 'quintal' THEN 'quintal'
        WHEN 'quintals' THEN 'quintal'
        WHEN 't' THEN 'tonne'
        WHEN 'ton' THEN 'tonne'
        WHEN 'tons' THEN 'tonne'
        WHEN 'tonne' THEN 'tonne'
        WHEN 'tonnes' THEN 'tonne'
        WHEN 'ml' THEN 'ml'
        WHEN 'millilitre' THEN 'ml'
        WHEN 'millilitres' THEN 'ml'
        WHEN 'milliliter' THEN 'ml'
        WHEN 'milliliters' THEN 'ml'
        WHEN 'l' THEN 'l'
        WHEN 'lt' THEN 'l'
        WHEN 'ltr' THEN 'l'
        WHEN 'litre' THEN 'l'
        WHEN 'litres' THEN 'l'
        WHEN 'liter' THEN 'l'
        WHEN 'liters' THEN 'l'
        ELSE lower(trim(unit))
      END
    ELSE lower(trim(unit))
  END;

UPDATE public.inventory_items
SET
  purchase_price_per_base_unit =
    CASE WHEN package_size > 0 THEN round(purchase_price / package_size, 6) ELSE purchase_price END,
  selling_price_per_base_unit =
    CASE
      WHEN selling_price IS NULL THEN NULL
      WHEN package_size > 0 THEN round(selling_price / package_size, 6)
      ELSE selling_price
    END
WHERE purchase_price_per_base_unit = 0
   OR purchase_price_per_base_unit IS NULL;

UPDATE public.product_variants pv
SET base_stock = round(coalesce(ii.base_quantity, pv.stock), 6)
FROM public.inventory_items ii
WHERE ii.id = pv.inventory_id;

-- Central server-side conversion layer. Count units are deliberately not interchangeable
-- (box -> piece is only possible through an explicit inventory package_size relationship).
CREATE OR REPLACE FUNCTION public.convert_unit_quantity(
  _quantity numeric,
  _from_unit text,
  _to_unit text
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v_from text := lower(trim(coalesce(_from_unit, '')));
  v_to text := lower(trim(coalesce(_to_unit, '')));
  v_from_group text;
  v_to_group text;
  v_from_factor numeric;
  v_to_factor numeric;
BEGIN
  IF _quantity IS NULL OR _quantity < 0 OR _quantity = 'NaN'::numeric THEN
    RAISE EXCEPTION 'Quantity must be a valid non-negative number';
  END IF;

  v_from := CASE v_from
    WHEN 'gm' THEN 'g'
    WHEN 'gram' THEN 'g'
    WHEN 'grams' THEN 'g'
    WHEN 'kilo' THEN 'kg'
    WHEN 'kilos' THEN 'kg'
    WHEN 'kilogram' THEN 'kg'
    WHEN 'kilograms' THEN 'kg'
    WHEN 'q' THEN 'quintal'
    WHEN 'quintals' THEN 'quintal'
    WHEN 't' THEN 'tonne'
    WHEN 'ton' THEN 'tonne'
    WHEN 'tons' THEN 'tonne'
    WHEN 'tonnes' THEN 'tonne'
    WHEN 'lt' THEN 'l'
    WHEN 'ltr' THEN 'l'
    WHEN 'litre' THEN 'l'
    WHEN 'litres' THEN 'l'
    WHEN 'liter' THEN 'l'
    WHEN 'liters' THEN 'l'
    WHEN 'millilitre' THEN 'ml'
    WHEN 'millilitres' THEN 'ml'
    WHEN 'milliliter' THEN 'ml'
    WHEN 'milliliters' THEN 'ml'
    WHEN 'pc' THEN 'piece'
    WHEN 'pcs' THEN 'piece'
    WHEN 'pieces' THEN 'piece'
    WHEN 'boxes' THEN 'box'
    WHEN 'pack' THEN 'packet'
    WHEN 'packs' THEN 'packet'
    WHEN 'packets' THEN 'packet'
    WHEN 'bags' THEN 'bag'
    ELSE v_from
  END;

  v_to := CASE v_to
    WHEN 'gm' THEN 'g'
    WHEN 'gram' THEN 'g'
    WHEN 'grams' THEN 'g'
    WHEN 'kilo' THEN 'kg'
    WHEN 'kilos' THEN 'kg'
    WHEN 'kilogram' THEN 'kg'
    WHEN 'kilograms' THEN 'kg'
    WHEN 'q' THEN 'quintal'
    WHEN 'quintals' THEN 'quintal'
    WHEN 't' THEN 'tonne'
    WHEN 'ton' THEN 'tonne'
    WHEN 'tons' THEN 'tonne'
    WHEN 'tonnes' THEN 'tonne'
    WHEN 'lt' THEN 'l'
    WHEN 'ltr' THEN 'l'
    WHEN 'litre' THEN 'l'
    WHEN 'litres' THEN 'l'
    WHEN 'liter' THEN 'l'
    WHEN 'liters' THEN 'l'
    WHEN 'millilitre' THEN 'ml'
    WHEN 'millilitres' THEN 'ml'
    WHEN 'milliliter' THEN 'ml'
    WHEN 'milliliters' THEN 'ml'
    WHEN 'pc' THEN 'piece'
    WHEN 'pcs' THEN 'piece'
    WHEN 'pieces' THEN 'piece'
    WHEN 'boxes' THEN 'box'
    WHEN 'pack' THEN 'packet'
    WHEN 'packs' THEN 'packet'
    WHEN 'packets' THEN 'packet'
    WHEN 'bags' THEN 'bag'
    ELSE v_to
  END;

  CASE v_from
    WHEN 'g' THEN v_from_group := 'weight'; v_from_factor := 1;
    WHEN 'kg' THEN v_from_group := 'weight'; v_from_factor := 1000;
    WHEN 'quintal' THEN v_from_group := 'weight'; v_from_factor := 100000;
    WHEN 'tonne' THEN v_from_group := 'weight'; v_from_factor := 1000000;
    WHEN 'ml' THEN v_from_group := 'volume'; v_from_factor := 1;
    WHEN 'l' THEN v_from_group := 'volume'; v_from_factor := 1000;
    WHEN 'piece' THEN v_from_group := 'piece'; v_from_factor := 1;
    WHEN 'box' THEN v_from_group := 'box'; v_from_factor := 1;
    WHEN 'packet' THEN v_from_group := 'packet'; v_from_factor := 1;
    WHEN 'bag' THEN v_from_group := 'bag'; v_from_factor := 1;
    ELSE RAISE EXCEPTION 'Unknown sale unit: %', _from_unit;
  END CASE;

  CASE v_to
    WHEN 'g' THEN v_to_group := 'weight'; v_to_factor := 1;
    WHEN 'kg' THEN v_to_group := 'weight'; v_to_factor := 1000;
    WHEN 'quintal' THEN v_to_group := 'weight'; v_to_factor := 100000;
    WHEN 'tonne' THEN v_to_group := 'weight'; v_to_factor := 1000000;
    WHEN 'ml' THEN v_to_group := 'volume'; v_to_factor := 1;
    WHEN 'l' THEN v_to_group := 'volume'; v_to_factor := 1000;
    WHEN 'piece' THEN v_to_group := 'piece'; v_to_factor := 1;
    WHEN 'box' THEN v_to_group := 'box'; v_to_factor := 1;
    WHEN 'packet' THEN v_to_group := 'packet'; v_to_factor := 1;
    WHEN 'bag' THEN v_to_group := 'bag'; v_to_factor := 1;
    ELSE RAISE EXCEPTION 'Unknown base unit: %', _to_unit;
  END CASE;

  IF v_from_group <> v_to_group THEN
    RAISE EXCEPTION 'Cannot convert % to %', _from_unit, _to_unit;
  END IF;

  RETURN round((_quantity * v_from_factor) / v_to_factor, 6);
END;
$function$;

CREATE OR REPLACE FUNCTION public.infer_inventory_pack(_unit text)
RETURNS TABLE(base_unit text, package_size numeric)
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v_unit text := lower(trim(coalesce(_unit, '')));
  v_match text[];
BEGIN
  v_match := regexp_match(
    v_unit,
    '^([0-9]+(?:\.[0-9]+)?)\s*(g|gm|gram|grams|kg|kilo|kilos|kilogram|kilograms|q|quintal|quintals|t|ton|tons|tonne|tonnes|ml|millilitre|millilitres|milliliter|milliliters|l|lt|ltr|litre|litres|liter|liters)\b'
  );

  IF v_match IS NOT NULL THEN
    base_unit := CASE v_match[2]
      WHEN 'g' THEN 'g' WHEN 'gm' THEN 'g' WHEN 'gram' THEN 'g' WHEN 'grams' THEN 'g'
      WHEN 'kg' THEN 'kg' WHEN 'kilo' THEN 'kg' WHEN 'kilos' THEN 'kg' WHEN 'kilogram' THEN 'kg' WHEN 'kilograms' THEN 'kg'
      WHEN 'q' THEN 'quintal' WHEN 'quintal' THEN 'quintal' WHEN 'quintals' THEN 'quintal'
      WHEN 't' THEN 'tonne' WHEN 'ton' THEN 'tonne' WHEN 'tons' THEN 'tonne' WHEN 'tonne' THEN 'tonne' WHEN 'tonnes' THEN 'tonne'
      WHEN 'ml' THEN 'ml' WHEN 'millilitre' THEN 'ml' WHEN 'millilitres' THEN 'ml' WHEN 'milliliter' THEN 'ml' WHEN 'milliliters' THEN 'ml'
      WHEN 'l' THEN 'l' WHEN 'lt' THEN 'l' WHEN 'ltr' THEN 'l' WHEN 'litre' THEN 'l' WHEN 'litres' THEN 'l' WHEN 'liter' THEN 'l' WHEN 'liters' THEN 'l'
      ELSE v_unit
    END;
    package_size := v_match[1]::numeric;
    RETURN NEXT;
    RETURN;
  END IF;

  base_unit := CASE v_unit
    WHEN 'g' THEN 'g' WHEN 'gm' THEN 'g' WHEN 'gram' THEN 'g' WHEN 'grams' THEN 'g'
    WHEN 'kg' THEN 'kg' WHEN 'kilo' THEN 'kg' WHEN 'kilos' THEN 'kg' WHEN 'kilogram' THEN 'kg' WHEN 'kilograms' THEN 'kg'
    WHEN 'q' THEN 'quintal' WHEN 'quintal' THEN 'quintal' WHEN 'quintals' THEN 'quintal'
    WHEN 't' THEN 'tonne' WHEN 'ton' THEN 'tonne' WHEN 'tons' THEN 'tonne' WHEN 'tonne' THEN 'tonne' WHEN 'tonnes' THEN 'tonne'
    WHEN 'ml' THEN 'ml' WHEN 'millilitre' THEN 'ml' WHEN 'millilitres' THEN 'ml' WHEN 'milliliter' THEN 'ml' WHEN 'milliliters' THEN 'ml'
    WHEN 'l' THEN 'l' WHEN 'lt' THEN 'l' WHEN 'ltr' THEN 'l' WHEN 'litre' THEN 'l' WHEN 'litres' THEN 'l' WHEN 'liter' THEN 'l' WHEN 'liters' THEN 'l'
    WHEN 'piece' THEN 'piece' WHEN 'pieces' THEN 'piece' WHEN 'pc' THEN 'piece' WHEN 'pcs' THEN 'piece'
    WHEN 'box' THEN 'box' WHEN 'boxes' THEN 'box'
    WHEN 'packet' THEN 'packet' WHEN 'packets' THEN 'packet' WHEN 'pack' THEN 'packet' WHEN 'packs' THEN 'packet'
    WHEN 'bag' THEN 'bag' WHEN 'bags' THEN 'bag'
    ELSE v_unit
  END;
  package_size := 1;
  RETURN NEXT;
END;
$function$;

-- Keep old inventory RPC callers working while routing all new writes through the normalized model.
CREATE OR REPLACE FUNCTION public.record_supplier_purchase_normalized(
  _supplier_id uuid,
  _product_name text,
  _quantity numeric,
  _unit text,
  _base_unit text,
  _package_size numeric,
  _purchase_price_per_base_unit numeric,
  _selling_price_per_base_unit numeric DEFAULT NULL,
  _allow_loose_sale boolean DEFAULT false,
  _min_stock_level numeric DEFAULT 0,
  _entry_date date DEFAULT current_date,
  _advance_paid numeric DEFAULT 0,
  _advance_method text DEFAULT 'cash'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_inventory_id uuid;
  v_supplier_name text;
  v_total numeric;
  v_advance numeric;
  v_new_due numeric;
  v_existing_quantity numeric;
  v_product_id uuid;
  v_variant_id uuid;
  v_base_quantity numeric;
  v_package_purchase_price numeric;
  v_package_selling_price numeric;
BEGIN
  IF NOT (select private.is_staff()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _quantity IS NULL OR _quantity <= 0 OR _quantity = 'NaN'::numeric THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;
  IF coalesce(trim(_product_name), '') = '' THEN
    RAISE EXCEPTION 'Product name is required';
  END IF;
  IF coalesce(trim(_unit), '') = '' OR coalesce(trim(_base_unit), '') = '' THEN
    RAISE EXCEPTION 'Inventory and base units are required';
  END IF;
  IF _package_size IS NULL OR _package_size <= 0 THEN
    RAISE EXCEPTION 'Package size must be greater than zero';
  END IF;
  IF _purchase_price_per_base_unit IS NULL OR _purchase_price_per_base_unit < 0
     OR _purchase_price_per_base_unit = 'NaN'::numeric THEN
    RAISE EXCEPTION 'Purchase price cannot be negative';
  END IF;
  IF _selling_price_per_base_unit IS NOT NULL
     AND (_selling_price_per_base_unit < 0 OR _selling_price_per_base_unit = 'NaN'::numeric) THEN
    RAISE EXCEPTION 'Selling price cannot be negative';
  END IF;
  IF coalesce(_advance_method, 'cash') NOT IN ('cash','upi','bank','cheque') THEN
    RAISE EXCEPTION 'Invalid advance payment method';
  END IF;

  v_base_quantity := round(_quantity * _package_size, 6);
  v_package_purchase_price := round(_purchase_price_per_base_unit * _package_size, 2);
  v_package_selling_price :=
    CASE WHEN _selling_price_per_base_unit IS NULL
      THEN NULL
      ELSE round(_selling_price_per_base_unit * _package_size, 2)
    END;
  v_total := round(v_base_quantity * _purchase_price_per_base_unit, 2);
  v_advance := greatest(coalesce(_advance_paid, 0), 0);

  SELECT company INTO v_supplier_name
  FROM public.suppliers
  WHERE id = _supplier_id
  FOR UPDATE;

  IF v_supplier_name IS NULL THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;
  IF v_advance > v_total THEN
    RAISE EXCEPTION 'Advance paid cannot exceed purchase total';
  END IF;

  SELECT id, quantity INTO v_inventory_id, v_existing_quantity
  FROM public.inventory_items
  WHERE supplier_id = _supplier_id
    AND lower(trim(product_name)) = lower(trim(_product_name))
    AND lower(trim(unit)) = lower(trim(_unit))
    AND lower(trim(base_unit)) = lower(trim(_base_unit))
    AND package_size = _package_size
    AND allow_loose_sale = coalesce(_allow_loose_sale, false)
    AND purchase_price_per_base_unit = _purchase_price_per_base_unit
    AND selling_price_per_base_unit IS NOT DISTINCT FROM _selling_price_per_base_unit
  ORDER BY last_updated DESC
  LIMIT 1
  FOR UPDATE;

  IF v_inventory_id IS NOT NULL THEN
    UPDATE public.inventory_items
    SET quantity = quantity + _quantity,
        purchase_price = v_package_purchase_price,
        selling_price = v_package_selling_price,
        allow_loose_sale = coalesce(_allow_loose_sale, false),
        min_stock_level = coalesce(_min_stock_level, min_stock_level, 0),
        status = CASE WHEN quantity + _quantity <= 0 THEN 'out-of-stock' ELSE 'in-stock' END,
        last_updated = coalesce(_entry_date, current_date)
    WHERE id = v_inventory_id;
  ELSE
    INSERT INTO public.inventory_items(
      product_name, supplier_id, supplier_name, quantity, unit,
      purchase_price, selling_price, min_stock_level, status, last_updated,
      base_unit, package_size, allow_loose_sale,
      purchase_price_per_base_unit, selling_price_per_base_unit
    )
    VALUES(
      _product_name, _supplier_id, v_supplier_name, _quantity, _unit,
      v_package_purchase_price, v_package_selling_price,
      coalesce(_min_stock_level,0),
      CASE WHEN _quantity <= 0 THEN 'out-of-stock' ELSE 'in-stock' END,
      coalesce(_entry_date,current_date),
      lower(trim(_base_unit)), _package_size, coalesce(_allow_loose_sale,false),
      _purchase_price_per_base_unit, _selling_price_per_base_unit
    )
    RETURNING id INTO v_inventory_id;
  END IF;

  SELECT id INTO v_product_id
  FROM public.products
  WHERE lower(trim(title)) = lower(trim(_product_name))
    AND status <> 'archived'
  ORDER BY case when status = 'published' then 0 else 1 end, created_at
  LIMIT 1
  FOR UPDATE;

  IF v_product_id IS NULL THEN
    INSERT INTO public.products(
      inventory_id, title, category, selling_price, discount_price, stock,
      description, tags, images, emoji, visibility, featured, status, published_on
    )
    VALUES(
      v_inventory_id, _product_name, 'Fertilizers',
      coalesce(v_package_selling_price, v_package_purchase_price),
      NULL, _quantity,
      '', array[]::text[], array[]::text[], '🌾', 'hidden', false, 'draft',
      current_date
    )
    RETURNING id INTO v_product_id;
  END IF;

  SELECT id INTO v_variant_id
  FROM public.product_variants
  WHERE inventory_id = v_inventory_id
  LIMIT 1
  FOR UPDATE;

  IF v_variant_id IS NULL THEN
    INSERT INTO public.product_variants(
      product_id, inventory_id, label, selling_price, stock, base_stock
    )
    VALUES(
      v_product_id, v_inventory_id, coalesce(nullif(trim(_unit),''),'unit'),
      coalesce(v_package_selling_price, v_package_purchase_price),
      greatest(_quantity,0), greatest(v_base_quantity,0)
    )
    RETURNING id INTO v_variant_id;
  ELSE
    UPDATE public.product_variants
    SET product_id = v_product_id,
        label = coalesce(nullif(trim(_unit),''),'unit'),
        selling_price = coalesce(v_package_selling_price, selling_price),
        stock = (select quantity from public.inventory_items where id = v_inventory_id),
        base_stock = (select base_quantity from public.inventory_items where id = v_inventory_id),
        updated_at = now()
    WHERE id = v_variant_id;
  END IF;

  UPDATE public.inventory_items
  SET product_variant_id = v_variant_id
  WHERE id = v_inventory_id;

  UPDATE public.products p
  SET stock = coalesce((
    SELECT sum(ii.quantity)
    FROM public.product_variants pv
    JOIN public.inventory_items ii ON ii.id = pv.inventory_id
    WHERE pv.product_id = p.id
  ), 0),
  selling_price = coalesce(v_package_selling_price, p.selling_price),
  updated_at = now()
  WHERE p.id = v_product_id;

  UPDATE public.suppliers
  SET total_purchases = coalesce(total_purchases,0) + v_total,
      total_paid = coalesce(total_paid,0) + v_advance,
      due_balance = coalesce(due_balance,0) + v_total - v_advance,
      last_order = coalesce(_entry_date,current_date),
      updated_at = now()
  WHERE id = _supplier_id
  RETURNING due_balance INTO v_new_due;

  INSERT INTO public.supplier_transactions(
    supplier_id, entry_date, entry_type, reference, amount, balance, method, remarks,
    inventory_item_id, product_name, quantity, unit, rate
  )
  VALUES(
    _supplier_id, coalesce(_entry_date,current_date), 'purchase', _product_name,
    v_total, v_new_due, 'credit',
    CASE WHEN v_existing_quantity IS NOT NULL
      THEN 'Additional stock added to existing inventory'
      ELSE NULL
    END,
    v_inventory_id, _product_name, _quantity, _unit, v_package_purchase_price
  );

  IF v_advance > 0 THEN
    INSERT INTO public.supplier_transactions(
      supplier_id, entry_date, entry_type, reference, amount, balance, method, remarks,
      inventory_item_id, product_name, quantity, unit, rate
    )
    VALUES(
      _supplier_id, coalesce(_entry_date,current_date), 'advance',
      'ADV-' || left(v_inventory_id::text,8), v_advance, v_new_due,
      coalesce(_advance_method,'cash'), 'Advance paid against inventory purchase',
      v_inventory_id, _product_name, _quantity, _unit, v_package_purchase_price
    );
  END IF;

  RETURN v_inventory_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_supplier_purchase(
  _supplier_id uuid,
  _product_name text,
  _quantity numeric,
  _unit text,
  _purchase_price numeric,
  _min_stock_level numeric DEFAULT 0,
  _entry_date date DEFAULT current_date,
  _advance_paid numeric DEFAULT 0,
  _advance_method text DEFAULT 'cash',
  _selling_price numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_base_unit text;
  v_package_size numeric;
BEGIN
  SELECT p.base_unit, p.package_size
  INTO v_base_unit, v_package_size
  FROM public.infer_inventory_pack(_unit) p;

  IF coalesce(v_base_unit, '') = '' THEN
    v_base_unit := lower(trim(_unit));
    v_package_size := 1;
  END IF;

  RETURN public.record_supplier_purchase_normalized(
    _supplier_id,
    _product_name,
    _quantity,
    _unit,
    v_base_unit,
    v_package_size,
    CASE WHEN v_package_size > 0 THEN _purchase_price / v_package_size ELSE _purchase_price END,
    CASE
      WHEN _selling_price IS NULL THEN NULL
      WHEN v_package_size > 0 THEN _selling_price / v_package_size
      ELSE _selling_price
    END,
    false,
    _min_stock_level,
    _entry_date,
    _advance_paid,
    _advance_method
  );
END;
$function$;

-- Keep variant stock synchronized while exposing a canonical physical base-stock value.
CREATE OR REPLACE FUNCTION public.sync_product_variant_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.product_variant_id IS NOT NULL THEN
    UPDATE public.product_variants
    SET stock = greatest(NEW.quantity, 0),
        base_stock = greatest(NEW.base_quantity, 0),
        updated_at = now()
    WHERE id = NEW.product_variant_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS inventory_variant_stock_sync ON public.inventory_items;
CREATE TRIGGER inventory_variant_stock_sync
AFTER INSERT OR UPDATE OF quantity, package_size ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.sync_product_variant_stock();

-- Override the legacy watch so product stock remains package-equivalent for the storefront,
-- while product variants also retain canonical base_stock.
CREATE OR REPLACE FUNCTION public.inventory_stock_watch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.products p
  SET stock = coalesce((
    SELECT sum(ii.quantity)
    FROM public.product_variants pv
    JOIN public.inventory_items ii ON ii.id = pv.inventory_id
    WHERE pv.product_id = p.id
  ), NEW.quantity, 0),
  updated_at = now()
  WHERE p.id = (
    SELECT pv.product_id FROM public.product_variants pv WHERE pv.inventory_id = NEW.id LIMIT 1
  );

  IF NEW.quantity <= NEW.min_stock_level THEN
    INSERT INTO public.reminders(
      title, audience, target, filter_summary, schedule, channel, due_amount,
      status, next_run, message, kind, source_id
    )
    VALUES(
      'Low stock: ' || NEW.product_name,
      'Shop owner', 'supplier',
      'Stock ' || NEW.quantity || ' ' || NEW.unit || ' at or below minimum ' || NEW.min_stock_level,
      'immediate', 'whatsapp', 0, 'active', current_date,
      'Reorder ' || NEW.product_name || ' from ' || coalesce(NEW.supplier_name,'supplier') ||
      '. Only ' || NEW.quantity || ' ' || NEW.unit || ' left.',
      'low-stock', NEW.id
    )
    ON CONFLICT (kind, source_id) WHERE source_id IS NOT NULL
    DO UPDATE SET status = 'active',
                  next_run = current_date,
                  filter_summary = EXCLUDED.filter_summary,
                  message = EXCLUDED.message,
                  updated_at = now();

    INSERT INTO public.notifications(title, body, type, link, source_id)
    VALUES(
      'Low stock alert',
      NEW.product_name || ' is down to ' || NEW.quantity || ' ' || NEW.unit,
      'warning',
      '/admin/inventory',
      NEW.id
    );
  ELSE
    UPDATE public.reminders
    SET status = 'completed', updated_at = now()
    WHERE kind = 'low-stock' AND source_id = NEW.id AND status = 'active';
  END IF;

  RETURN NULL;
END;
$function$;

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
$function$;

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
AS $function$
BEGIN
  RETURN public.create_khata_sale_with_bargaining(
    _customer_id, _items, _paid, 0, _method, _entry_date, _remarks
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.convert_unit_quantity(numeric, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.infer_inventory_pack(text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.record_supplier_purchase_normalized(
  uuid, text, numeric, text, text, numeric, numeric, numeric, boolean, numeric, date, numeric, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_supplier_purchase_normalized(
  uuid, text, numeric, text, text, numeric, numeric, numeric, boolean, numeric, date, numeric, text
) TO authenticated;

REVOKE ALL ON FUNCTION public.record_supplier_purchase(
  uuid, text, numeric, text, numeric, numeric, date, numeric, text, numeric
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_supplier_purchase(
  uuid, text, numeric, text, numeric, numeric, date, numeric, text, numeric
) TO authenticated;

REVOKE ALL ON FUNCTION public.create_khata_sale_with_bargaining(
  uuid, jsonb, numeric, numeric, text, date, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_khata_sale_with_bargaining(
  uuid, jsonb, numeric, numeric, text, date, text
) TO authenticated;

REVOKE ALL ON FUNCTION public.create_khata_sale(
  uuid, jsonb, numeric, text, date, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_khata_sale(
  uuid, jsonb, numeric, text, date, text
) TO authenticated;
