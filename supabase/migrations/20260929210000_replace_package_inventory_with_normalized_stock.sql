-- Replace the legacy package/base-unit operational model with normalized inventory lots.
-- Historical supplier transactions retain their original purchase audit data.
-- Operational inventory becomes: quantity + unit + purchase price/unit + reference selling price/unit.
BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_inventory_unit(_unit text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v text := lower(trim(coalesce(_unit, '')));
BEGIN
  v := regexp_replace(v, '^[0-9]+(?:\.[0-9]+)?\s*', '');
  v := regexp_replace(v, '\s+(bag|bags|pack|packs|packet|packets|bottle|bottles)$', '');
  RETURN CASE v
    WHEN 'gm' THEN 'g' WHEN 'gram' THEN 'g' WHEN 'grams' THEN 'g' WHEN 'g' THEN 'g'
    WHEN 'kgs' THEN 'kg' WHEN 'kilo' THEN 'kg' WHEN 'kilos' THEN 'kg'
    WHEN 'kilogram' THEN 'kg' WHEN 'kilograms' THEN 'kg' WHEN 'kg' THEN 'kg'
    WHEN 'q' THEN 'quintal' WHEN 'quintals' THEN 'quintal' WHEN 'quintal' THEN 'quintal'
    WHEN 't' THEN 'tonne' WHEN 'ton' THEN 'tonne' WHEN 'tons' THEN 'tonne'
    WHEN 'tonne' THEN 'tonne' WHEN 'tonnes' THEN 'tonne'
    WHEN 'ml' THEN 'ml' WHEN 'millilitre' THEN 'ml' WHEN 'millilitres' THEN 'ml'
    WHEN 'milliliter' THEN 'ml' WHEN 'milliliters' THEN 'ml'
    WHEN 'l' THEN 'l' WHEN 'lt' THEN 'l' WHEN 'ltr' THEN 'l'
    WHEN 'litre' THEN 'l' WHEN 'litres' THEN 'l' WHEN 'liter' THEN 'l' WHEN 'liters' THEN 'l'
    WHEN 'piece' THEN 'piece' WHEN 'pieces' THEN 'piece' WHEN 'pc' THEN 'piece' WHEN 'pcs' THEN 'piece'
    WHEN 'meter' THEN 'meter' WHEN 'metre' THEN 'meter' WHEN 'm' THEN 'meter'
    WHEN 'box' THEN 'box' WHEN 'boxes' THEN 'box'
    WHEN 'packet' THEN 'packet' WHEN 'packets' THEN 'packet' WHEN 'pack' THEN 'packet' WHEN 'packs' THEN 'packet'
    WHEN 'bag' THEN 'bag' WHEN 'bags' THEN 'bag'
    WHEN 'bottle' THEN 'bottle' WHEN 'bottles' THEN 'bottle'
    ELSE v
  END;
END;
$function$;

CREATE TEMP TABLE _inventory_normalization_backup ON COMMIT DROP AS
SELECT
  i.id,
  i.quantity old_quantity,
  i.unit old_unit,
  i.purchase_price old_purchase_price,
  i.selling_price old_selling_price,
  i.base_unit old_base_unit,
  i.package_size old_package_size,
  i.base_quantity old_base_quantity,
  i.purchase_price_per_base_unit old_purchase_cost_per_unit,
  i.selling_price_per_base_unit old_reference_price_per_unit,
  r.normalized_unit,
  r.effective_package_size,
  round(i.quantity * r.effective_package_size, 6) normalized_quantity,
  round(coalesce(nullif(i.purchase_price_per_base_unit,0),
                 i.purchase_price / r.effective_package_size), 6) normalized_purchase_price,
  CASE WHEN i.selling_price IS NULL THEN NULL
       ELSE round(coalesce(nullif(i.selling_price_per_base_unit,0),
                           i.selling_price / r.effective_package_size), 6)
  END normalized_selling_price
FROM public.inventory_items i
CROSS JOIN LATERAL (
  SELECT
    CASE
      WHEN regexp_match(lower(trim(i.unit)),
        '^([0-9]+(?:\.[0-9]+)?)\s*(g|gm|gram|grams|kg|kilo|kilos|kilogram|kilograms|q|quintal|quintals|t|ton|tons|tonne|tonnes|ml|millilitre|millilitres|milliliter|milliliters|l|lt|ltr|litre|litres|liter|liters)\b') IS NOT NULL
      THEN public.normalize_inventory_unit((
        regexp_match(lower(trim(i.unit)),
          '^([0-9]+(?:\.[0-9]+)?)\s*(g|gm|gram|grams|kg|kilo|kilos|kilogram|kilograms|q|quintal|quintals|t|ton|tons|tonne|tonnes|ml|millilitre|millilitres|milliliter|milliliters|l|lt|ltr|litre|litres|liter|liters)\b'
        ))[2])
      WHEN i.package_size <> 1 THEN public.normalize_inventory_unit(i.base_unit)
      ELSE public.normalize_inventory_unit(i.unit)
    END normalized_unit,
    CASE
      WHEN regexp_match(lower(trim(i.unit)),
        '^([0-9]+(?:\.[0-9]+)?)\s*(g|gm|gram|grams|kg|kilo|kilos|kilogram|kilograms|q|quintal|quintals|t|ton|tons|tonne|tonnes|ml|millilitre|millilitres|milliliter|milliliters|l|lt|ltr|litre|litres|liter|liters)\b') IS NOT NULL
      THEN (regexp_match(lower(trim(i.unit)),
        '^([0-9]+(?:\.[0-9]+)?)\s*(g|gm|gram|grams|kg|kilo|kilos|kilogram|kilograms|q|quintal|quintals|t|ton|tons|tonne|tonnes|ml|millilitre|millilitres|milliliter|milliliters|l|lt|ltr|litre|litres|liter|liters)\b'
      ))[1]::numeric
      ELSE greatest(coalesce(i.package_size,1),0.000001)
    END effective_package_size
) r;

DO $$
DECLARE old_value numeric; new_value numeric;
BEGIN
  SELECT round(sum(quantity*purchase_price),2) INTO old_value FROM public.inventory_items;
  SELECT round(sum(normalized_quantity*normalized_purchase_price),2) INTO new_value FROM _inventory_normalization_backup;
  IF old_value IS DISTINCT FROM new_value THEN
    RAISE EXCEPTION 'Inventory purchase value mismatch: old %, new %', old_value, new_value;
  END IF;
END $$;

ALTER TABLE public.inventory_items DISABLE TRIGGER USER;

UPDATE public.inventory_items i
SET quantity=b.normalized_quantity,
    unit=b.normalized_unit,
    purchase_price=b.normalized_purchase_price,
    selling_price=b.normalized_selling_price
FROM _inventory_normalization_backup b
WHERE i.id=b.id;

-- Product stock must represent all independent inventory lots, not package variants.
CREATE OR REPLACE FUNCTION public.inventory_stock_watch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $function$
BEGIN
  UPDATE public.products p
  SET stock=coalesce((
      SELECT sum(ii.quantity)
      FROM public.inventory_items ii
      WHERE ii.id=p.inventory_id OR EXISTS (
        SELECT 1 FROM public.product_variants pv
        WHERE pv.product_id=p.id AND pv.inventory_id=ii.id
      )
    ), NEW.quantity, 0),
    updated_at=now()
  WHERE p.id=(
    SELECT pv.product_id FROM public.product_variants pv
    WHERE pv.inventory_id=NEW.id LIMIT 1
  ) OR p.inventory_id=NEW.id;

  IF NEW.quantity <= NEW.min_stock_level THEN
    INSERT INTO public.reminders(
      title,audience,target,filter_summary,schedule,channel,due_amount,status,next_run,message,kind,source_id
    )
    VALUES(
      'Low stock: '||NEW.product_name,'Shop owner','supplier',
      'Stock '||NEW.quantity||' '||NEW.unit||' at or below minimum '||NEW.min_stock_level,
      'immediate','whatsapp',0,'active',current_date,
      'Reorder '||NEW.product_name||' from '||coalesce(NEW.supplier_name,'supplier')||
      '. Only '||NEW.quantity||' '||NEW.unit||' left.',
      'low-stock',NEW.id
    )
    ON CONFLICT (kind,source_id) WHERE source_id IS NOT NULL
    DO UPDATE SET status='active',next_run=current_date,
      filter_summary=EXCLUDED.filter_summary,message=EXCLUDED.message,updated_at=now();
  ELSE
    UPDATE public.reminders SET status='completed',updated_at=now()
    WHERE kind='low-stock' AND source_id=NEW.id AND status='active';
  END IF;
  RETURN NULL;
END;
$function$;

UPDATE public.product_variants pv
SET stock=greatest(i.quantity,0),
    base_stock=greatest(i.quantity,0),
    updated_at=now()
FROM public.inventory_items i
WHERE i.product_variant_id=pv.id;

UPDATE public.products p
SET stock=coalesce((
  SELECT sum(i.quantity)
  FROM public.inventory_items i
  WHERE i.id=p.inventory_id
     OR i.product_variant_id IN (SELECT pv.id FROM public.product_variants pv WHERE pv.product_id=p.id)
),0),
updated_at=now()
WHERE p.id IN (
  SELECT p2.id FROM public.products p2
  LEFT JOIN public.product_variants pv ON pv.product_id=p2.id
  LEFT JOIN public.inventory_items i ON i.id=p2.inventory_id OR i.product_variant_id=pv.id
  WHERE i.id IS NOT NULL
);

ALTER TABLE public.inventory_items ENABLE TRIGGER USER;

DROP TRIGGER IF EXISTS inventory_variant_stock_sync ON public.inventory_items;
CREATE TRIGGER inventory_variant_stock_sync
AFTER INSERT OR UPDATE OF quantity ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.sync_product_variant_stock();

CREATE OR REPLACE FUNCTION public.sync_product_variant_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path=public
AS $function$
BEGIN
  IF NEW.product_variant_id IS NOT NULL THEN
    UPDATE public.product_variants
    SET stock=greatest(NEW.quantity,0),base_stock=greatest(NEW.quantity,0),updated_at=now()
    WHERE id=NEW.product_variant_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP FUNCTION IF EXISTS public.record_supplier_purchase_normalized(
  uuid,text,numeric,text,text,numeric,numeric,numeric,boolean,numeric,date,numeric,text
);
DROP FUNCTION IF EXISTS public.record_supplier_purchase(
  uuid,text,numeric,text,numeric,numeric,date,numeric,text,numeric
);
DROP FUNCTION IF EXISTS public.infer_inventory_pack(text);

CREATE OR REPLACE FUNCTION public.record_inventory_lot_purchase(
  _supplier_id uuid,
  _product_name text,
  _quantity numeric,
  _unit text,
  _purchase_price_per_unit numeric,
  _reference_selling_price_per_unit numeric DEFAULT NULL,
  _allow_loose_sale boolean DEFAULT false,
  _min_stock_level numeric DEFAULT 0,
  _entry_date date DEFAULT current_date,
  _advance_paid numeric DEFAULT 0,
  _advance_method text DEFAULT 'cash'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $function$
DECLARE v_inventory_id uuid; v_supplier_name text; v_product_id uuid; v_variant_id uuid; v_total numeric; v_advance numeric; v_due numeric; v_unit text;
BEGIN
  IF NOT private.is_staff() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  v_unit:=public.normalize_inventory_unit(_unit);
  IF coalesce(v_unit,'')='' THEN RAISE EXCEPTION 'Inventory unit is required'; END IF;
  IF _quantity IS NULL OR _quantity<=0 OR _quantity='NaN'::numeric THEN RAISE EXCEPTION 'Quantity must be greater than zero'; END IF;
  IF _purchase_price_per_unit IS NULL OR _purchase_price_per_unit<0 OR _purchase_price_per_unit='NaN'::numeric THEN RAISE EXCEPTION 'Purchase price cannot be negative'; END IF;
  IF _reference_selling_price_per_unit IS NOT NULL AND (_reference_selling_price_per_unit<0 OR _reference_selling_price_per_unit='NaN'::numeric) THEN RAISE EXCEPTION 'Reference selling price cannot be negative'; END IF;
  IF coalesce(trim(_product_name),'')='' THEN RAISE EXCEPTION 'Product name is required'; END IF;
  IF coalesce(_advance_method,'cash') NOT IN ('cash','upi','bank','cheque') THEN RAISE EXCEPTION 'Invalid advance payment method'; END IF;

  v_total:=round(_quantity*_purchase_price_per_unit,2);
  v_advance:=greatest(coalesce(_advance_paid,0),0);
  SELECT company INTO v_supplier_name FROM public.suppliers WHERE id=_supplier_id FOR UPDATE;
  IF v_supplier_name IS NULL THEN RAISE EXCEPTION 'Supplier not found'; END IF;
  IF v_advance>v_total THEN RAISE EXCEPTION 'Advance paid cannot exceed purchase total'; END IF;

  -- Every purchase is an independent lot. Never average or overwrite another lot.
  INSERT INTO public.inventory_items(
    product_name,supplier_id,supplier_name,quantity,unit,purchase_price,selling_price,
    min_stock_level,status,last_updated,allow_loose_sale
  )
  VALUES(
    _product_name,_supplier_id,v_supplier_name,round(_quantity,6),v_unit,
    round(_purchase_price_per_unit,6),
    CASE WHEN _reference_selling_price_per_unit IS NULL THEN NULL ELSE round(_reference_selling_price_per_unit,6) END,
    greatest(coalesce(_min_stock_level,0),0),
    'in-stock',coalesce(_entry_date,current_date),coalesce(_allow_loose_sale,false)
  )
  RETURNING id INTO v_inventory_id;

  SELECT id INTO v_product_id
  FROM public.products
  WHERE lower(trim(title))=lower(trim(_product_name)) AND status<>'archived'
  ORDER BY CASE WHEN status='published' THEN 0 ELSE 1 END,created_at
  LIMIT 1 FOR UPDATE;

  IF v_product_id IS NULL THEN
    INSERT INTO public.products(
      inventory_id,title,category,selling_price,discount_price,stock,description,tags,images,emoji,visibility,featured,status,published_on
    )
    VALUES(
      v_inventory_id,_product_name,'Fertilizers',
      coalesce(_reference_selling_price_per_unit,_purchase_price_per_unit),NULL,round(_quantity,6),
      '',array[]::text[],array[]::text[],'🌾','hidden',false,'draft',current_date
    )
    RETURNING id INTO v_product_id;
  END IF;

  -- A product can already have a variant with this unit. Do not reuse/reprice it.
  SELECT id INTO v_variant_id
  FROM public.product_variants
  WHERE inventory_id=v_inventory_id LIMIT 1 FOR UPDATE;
  IF v_variant_id IS NULL AND NOT EXISTS(
    SELECT 1 FROM public.product_variants
    WHERE product_id=v_product_id AND lower(trim(label))=lower(trim(v_unit))
  ) THEN
    INSERT INTO public.product_variants(product_id,inventory_id,label,selling_price,stock,base_stock)
    VALUES(v_product_id,v_inventory_id,v_unit,
      coalesce(_reference_selling_price_per_unit,_purchase_price_per_unit),
      round(_quantity,6),round(_quantity,6))
    RETURNING id INTO v_variant_id;
    UPDATE public.inventory_items SET product_variant_id=v_variant_id WHERE id=v_inventory_id;
  END IF;

  UPDATE public.products p
  SET stock=coalesce((SELECT sum(i.quantity) FROM public.inventory_items i
                      WHERE i.id=p.inventory_id
                         OR i.product_variant_id IN (SELECT pv.id FROM public.product_variants pv WHERE pv.product_id=p.id)),0),
      updated_at=now()
  WHERE p.id=v_product_id;

  UPDATE public.suppliers
  SET total_purchases=coalesce(total_purchases,0)+v_total,
      total_paid=coalesce(total_paid,0)+v_advance,
      due_balance=coalesce(due_balance,0)+v_total-v_advance,
      last_order=coalesce(_entry_date,current_date),updated_at=now()
  WHERE id=_supplier_id
  RETURNING due_balance INTO v_due;

  INSERT INTO public.supplier_transactions(
    supplier_id,entry_date,entry_type,reference,amount,balance,method,remarks,
    inventory_item_id,product_name,quantity,unit,rate
  )
  VALUES(
    _supplier_id,coalesce(_entry_date,current_date),'purchase',_product_name,
    v_total,v_due,'credit',NULL,v_inventory_id,_product_name,round(_quantity,6),v_unit,
    round(_purchase_price_per_unit,6)
  );

  IF v_advance>0 THEN
    INSERT INTO public.supplier_transactions(
      supplier_id,entry_date,entry_type,reference,amount,balance,method,remarks,
      inventory_item_id,product_name,quantity,unit,rate
    )
    VALUES(
      _supplier_id,coalesce(_entry_date,current_date),'advance',
      'ADV-'||left(v_inventory_id::text,8),v_advance,v_due,coalesce(_advance_method,'cash'),
      'Advance paid against inventory purchase',v_inventory_id,_product_name,
      round(_quantity,6),v_unit,round(_purchase_price_per_unit,6)
    );
  END IF;
  RETURN v_inventory_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_khata_sale_with_bargaining(
  _customer_id uuid,_items jsonb,_paid numeric DEFAULT 0,_bargaining_amount numeric DEFAULT 0,
  _method text DEFAULT 'cash',_entry_date date DEFAULT current_date,_remarks text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $function$
DECLARE
  v_item jsonb; v_product_id uuid; v_variant_id uuid; v_inventory_id uuid; v_product_name text;
  v_qty numeric; v_unit text; v_normalized_qty numeric; v_inventory_unit text; v_rate numeric;
  v_final_amount numeric; v_calculated_amount numeric; v_realized_rate numeric;
  v_purchase_cost numeric; v_available numeric; v_allow_loose boolean;
  v_subtotal numeric:=0; v_bargaining numeric:=greatest(coalesce(_bargaining_amount,0),0);
  v_final_total numeric:=0; v_count integer:=0; v_tx_id uuid; v_summary text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.customers WHERE id=_customer_id) THEN RAISE EXCEPTION 'Customer not found'; END IF;
  IF _items IS NULL OR jsonb_typeof(_items)<>'array' OR jsonb_array_length(_items)=0 THEN RAISE EXCEPTION 'At least one item is required'; END IF;
  IF _paid IS NULL OR _paid<0 THEN RAISE EXCEPTION 'Paid amount cannot be negative'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty:=coalesce(nullif(v_item->>'entered_quantity','')::numeric,nullif(v_item->>'quantity','')::numeric,0);
    v_unit:=public.normalize_inventory_unit(coalesce(nullif(trim(v_item->>'entered_unit'),''),nullif(trim(v_item->>'unit'),''),'unit'));
    v_rate:=coalesce(nullif(v_item->>'rate','')::numeric,0);
    v_final_amount:=CASE WHEN nullif(v_item->>'final_amount','') IS NULL THEN NULL ELSE (v_item->>'final_amount')::numeric END;
    v_product_name:=coalesce(nullif(v_item->>'product',''),'Item');
    v_product_id:=nullif(v_item->>'product_id','')::uuid;
    v_inventory_id:=nullif(v_item->>'inventory_id','')::uuid;
    v_variant_id:=nullif(v_item->>'product_variant_id','')::uuid;
    IF v_qty<=0 THEN RAISE EXCEPTION 'Quantity must be greater than zero for %',v_product_name; END IF;
    IF v_rate<0 THEN RAISE EXCEPTION 'Selling rate cannot be negative for %',v_product_name; END IF;

    IF v_variant_id IS NOT NULL THEN
      SELECT product_id,inventory_id INTO v_product_id,v_inventory_id
      FROM public.product_variants WHERE id=v_variant_id FOR UPDATE;
    END IF;
    IF v_inventory_id IS NULL AND v_product_id IS NOT NULL THEN
      SELECT inventory_id INTO v_inventory_id FROM public.products WHERE id=v_product_id FOR UPDATE;
    END IF;

    v_normalized_qty:=v_qty; v_inventory_unit:=v_unit; v_purchase_cost:=0; v_available:=NULL; v_allow_loose:=false;
    IF v_inventory_id IS NOT NULL THEN
      SELECT unit,quantity,purchase_price,allow_loose_sale
      INTO v_inventory_unit,v_available,v_purchase_cost,v_allow_loose
      FROM public.inventory_items WHERE id=v_inventory_id FOR UPDATE;
      IF v_available IS NULL THEN RAISE EXCEPTION 'Inventory item not found for %',v_product_name; END IF;
      v_inventory_unit:=public.normalize_inventory_unit(v_inventory_unit);
      IF v_allow_loose THEN
        v_normalized_qty:=public.convert_unit_quantity(v_qty,v_unit,v_inventory_unit);
      ELSIF v_unit<>v_inventory_unit OR v_qty<>trunc(v_qty) THEN
        RAISE EXCEPTION '% must be sold as complete % units',v_product_name,v_inventory_unit;
      END IF;
      IF v_normalized_qty>v_available THEN
        RAISE EXCEPTION 'Insufficient stock for %: available % %, requested % %',v_product_name,v_available,v_inventory_unit,v_normalized_qty,v_inventory_unit;
      END IF;
    END IF;

    v_calculated_amount:=round(v_normalized_qty*v_rate,2);
    v_final_amount:=coalesce(v_final_amount,v_calculated_amount);
    IF v_final_amount<0 THEN RAISE EXCEPTION 'Final sale amount cannot be negative for %',v_product_name; END IF;
    v_subtotal:=v_subtotal+v_final_amount; v_count:=v_count+1;
  END LOOP;

  IF v_bargaining>v_subtotal THEN RAISE EXCEPTION 'Bargaining amount (%) cannot exceed sale subtotal (%)',v_bargaining,v_subtotal; END IF;
  v_final_total:=round(v_subtotal-v_bargaining,2);
  IF _paid>v_final_total THEN RAISE EXCEPTION 'Paid amount (%) cannot exceed final sale total (%)',_paid,v_final_total; END IF;

  SELECT coalesce(nullif(x->>'product',''),'Item') INTO v_summary FROM jsonb_array_elements(_items) x LIMIT 1;
  IF v_count>1 THEN v_summary:=v_summary||' + '||(v_count-1)||' more'; END IF;

  INSERT INTO public.customer_transactions(
    customer_id,entry_date,entry_type,product,quantity,subtotal,discount_amount,amount,payment,method,remarks
  ) VALUES(
    _customer_id,coalesce(_entry_date,current_date),'sale',v_summary,v_count,v_subtotal,v_bargaining,
    v_final_total,_paid,coalesce(_method,'cash'),_remarks
  ) RETURNING id INTO v_tx_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty:=coalesce(nullif(v_item->>'entered_quantity','')::numeric,nullif(v_item->>'quantity','')::numeric,0);
    v_unit:=public.normalize_inventory_unit(coalesce(nullif(trim(v_item->>'entered_unit'),''),nullif(trim(v_item->>'unit'),''),'unit'));
    v_rate:=coalesce(nullif(v_item->>'rate','')::numeric,0);
    v_final_amount:=CASE WHEN nullif(v_item->>'final_amount','') IS NULL THEN NULL ELSE (v_item->>'final_amount')::numeric END;
    v_product_name:=coalesce(nullif(v_item->>'product',''),'Item');
    v_product_id:=nullif(v_item->>'product_id','')::uuid;
    v_inventory_id:=nullif(v_item->>'inventory_id','')::uuid;
    v_variant_id:=nullif(v_item->>'product_variant_id','')::uuid;
    v_purchase_cost:=0; v_normalized_qty:=v_qty; v_inventory_unit:=v_unit; v_available:=NULL; v_allow_loose:=false;

    IF v_variant_id IS NOT NULL THEN
      SELECT product_id,inventory_id INTO v_product_id,v_inventory_id FROM public.product_variants WHERE id=v_variant_id;
    END IF;
    IF v_inventory_id IS NULL AND v_product_id IS NOT NULL THEN
      SELECT inventory_id INTO v_inventory_id FROM public.products WHERE id=v_product_id;
    END IF;

    IF v_inventory_id IS NOT NULL THEN
      SELECT unit,quantity,purchase_price,allow_loose_sale
      INTO v_inventory_unit,v_available,v_purchase_cost,v_allow_loose
      FROM public.inventory_items WHERE id=v_inventory_id;
      v_inventory_unit:=public.normalize_inventory_unit(v_inventory_unit);
      IF v_allow_loose THEN
        v_normalized_qty:=public.convert_unit_quantity(v_qty,v_unit,v_inventory_unit);
      END IF;
    END IF;

    v_calculated_amount:=round(v_normalized_qty*v_rate,2);
    v_final_amount:=coalesce(v_final_amount,v_calculated_amount);
    v_realized_rate:=CASE WHEN v_normalized_qty=0 THEN 0 ELSE round(v_final_amount/v_normalized_qty,6) END;

    INSERT INTO public.customer_transaction_items(
      transaction_id,product_id,product_variant_id,product,quantity,unit,rate,amount,
      purchase_cost,admin_price_inc,entered_quantity,entered_unit,base_quantity,base_unit,
      purchase_cost_per_base_unit,selling_rate_per_base_unit,calculated_amount,final_sale_amount
    ) VALUES(
      v_tx_id,v_product_id,v_variant_id,v_product_name,round(v_normalized_qty,6),v_inventory_unit,
      round(v_rate,6),round(v_final_amount,2),coalesce(v_purchase_cost,0),v_realized_rate,
      round(v_qty,6),v_unit,round(v_normalized_qty,6),v_inventory_unit,coalesce(v_purchase_cost,0),
      v_realized_rate,v_calculated_amount,round(v_final_amount,2)
    );

    IF v_inventory_id IS NOT NULL THEN
      UPDATE public.inventory_items
      SET quantity=round(greatest(quantity-v_normalized_qty,0),6),
          last_updated=current_date,
          status=CASE WHEN quantity-v_normalized_qty<=0 THEN 'out-of-stock' ELSE 'in-stock' END
      WHERE id=v_inventory_id AND quantity>=v_normalized_qty;
      IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock for %',v_product_name; END IF;
    ELSIF v_product_id IS NOT NULL THEN
      UPDATE public.products SET stock=stock-v_normalized_qty,updated_at=now()
      WHERE id=v_product_id AND stock>=v_normalized_qty;
      IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient product stock for %',v_product_name; END IF;
    END IF;
  END LOOP;
  RETURN v_tx_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_khata_sale(
  _customer_id uuid,_items jsonb,_paid numeric DEFAULT 0,_method text DEFAULT 'cash',
  _entry_date date DEFAULT current_date,_remarks text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
BEGIN
  RETURN public.create_khata_sale_with_bargaining(_customer_id,_items,_paid,0,_method,_entry_date,_remarks);
END;
$function$;

REVOKE ALL ON FUNCTION public.normalize_inventory_unit(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.record_inventory_lot_purchase(uuid,text,numeric,text,numeric,numeric,boolean,numeric,date,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_inventory_lot_purchase(uuid,text,numeric,text,numeric,numeric,boolean,numeric,date,numeric,text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_khata_sale_with_bargaining(uuid,jsonb,numeric,numeric,text,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_khata_sale_with_bargaining(uuid,jsonb,numeric,numeric,text,date,text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_khata_sale(uuid,jsonb,numeric,text,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_khata_sale(uuid,jsonb,numeric,text,date,text) TO authenticated;

ALTER TABLE public.inventory_items
  DROP COLUMN IF EXISTS base_quantity,
  DROP COLUMN IF EXISTS package_size,
  DROP COLUMN IF EXISTS base_unit,
  DROP COLUMN IF EXISTS purchase_price_per_base_unit,
  DROP COLUMN IF EXISTS selling_price_per_base_unit;

COMMIT;