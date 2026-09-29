-- Connect normalized inventory lots to Admin Khata sales.
BEGIN;

ALTER TABLE public.customer_transaction_items ADD COLUMN IF NOT EXISTS inventory_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='customer_transaction_items_inventory_id_fkey') THEN
    ALTER TABLE public.customer_transaction_items
      ADD CONSTRAINT customer_transaction_items_inventory_id_fkey
      FOREIGN KEY (inventory_id) REFERENCES public.inventory_items(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_transaction_items_inventory_id
  ON public.customer_transaction_items(inventory_id);

CREATE OR REPLACE FUNCTION public.validate_product_reference_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path=public
AS $function$
BEGIN
  IF NEW.product_variant_id IS NOT NULL THEN
    IF NEW.product_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.product_variants pv
      WHERE pv.id=NEW.product_variant_id AND pv.product_id=NEW.product_id
    ) THEN
      RAISE EXCEPTION 'Product variant % does not belong to product %',NEW.product_variant_id,NEW.product_id;
    END IF;

    IF NEW.inventory_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.product_variants pv
      WHERE pv.id=NEW.product_variant_id AND pv.inventory_id=NEW.inventory_id
    ) THEN
      RAISE EXCEPTION 'Product variant % does not belong to inventory lot %',NEW.product_variant_id,NEW.inventory_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_customer_transaction_item_product_links()
RETURNS trigger
LANGUAGE plpgsql
SET search_path=public
AS $function$
DECLARE
  v_product_id uuid; v_variant_id uuid; v_product_matches integer;
BEGIN
  IF NEW.product_id IS NULL AND NEW.product_variant_id IS NOT NULL THEN
    SELECT pv.product_id INTO v_product_id FROM public.product_variants pv WHERE pv.id=NEW.product_variant_id;
  END IF;

  IF NEW.product_id IS NULL AND NEW.inventory_id IS NOT NULL THEN
    SELECT i.product_id INTO v_product_id FROM public.inventory_items i WHERE i.id=NEW.inventory_id;
  END IF;

  IF NEW.product_id IS NULL AND NEW.inventory_id IS NULL AND nullif(trim(NEW.product),'') IS NOT NULL THEN
    SELECT count(*) INTO v_product_matches
    FROM public.products p WHERE lower(trim(p.title))=lower(trim(NEW.product));
    IF v_product_matches=1 THEN
      SELECT p.id INTO v_product_id FROM public.products p
      WHERE lower(trim(p.title))=lower(trim(NEW.product)) LIMIT 1;
    END IF;
  END IF;

  IF NEW.product_id IS NULL THEN NEW.product_id:=v_product_id; END IF;

  IF NEW.product_variant_id IS NULL AND NEW.inventory_id IS NOT NULL AND NEW.product_id IS NOT NULL THEN
    SELECT pv.id INTO v_variant_id
    FROM public.product_variants pv
    WHERE pv.product_id=NEW.product_id
      AND pv.inventory_id=NEW.inventory_id
      AND pv.status='active'
    LIMIT 1;
    IF v_variant_id IS NOT NULL THEN NEW.product_variant_id:=v_variant_id; END IF;
  ELSIF NEW.product_variant_id IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT count(*) INTO v_product_matches
    FROM public.product_variants pv
    WHERE pv.product_id=NEW.product_id AND pv.status='active'
      AND lower(trim(pv.label))=lower(trim(coalesce(NEW.unit,'')));
    IF v_product_matches=1 THEN
      SELECT pv.id INTO v_variant_id
      FROM public.product_variants pv
      WHERE pv.product_id=NEW.product_id AND pv.status='active'
        AND lower(trim(pv.label))=lower(trim(coalesce(NEW.unit,''))) LIMIT 1;
      NEW.product_variant_id:=v_variant_id;
    END IF;
  END IF;
  RETURN NEW;
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
SET search_path=public
AS $function$
DECLARE
  v_item jsonb; v_lock_id uuid;
  v_product_id uuid; v_inventory_id uuid; v_variant_id uuid; v_inventory_product_id uuid; v_product_inventory_id uuid;
  v_product_name text; v_qty numeric; v_unit text; v_inventory_unit text; v_normalized_qty numeric;
  v_rate numeric; v_final_amount numeric; v_calculated_amount numeric; v_realized_rate numeric;
  v_purchase_cost numeric; v_available numeric; v_allow_loose boolean;
  v_subtotal numeric:=0; v_bargaining numeric:=greatest(coalesce(_bargaining_amount,0),0);
  v_final_total numeric:=0; v_count integer:=0; v_tx_id uuid; v_summary text;
  v_lock_ids uuid[];
  v_requested_by_inventory jsonb:='{}'::jsonb; v_requested_total numeric;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.customers WHERE id=_customer_id) THEN RAISE EXCEPTION 'Customer not found'; END IF;
  IF _items IS NULL OR jsonb_typeof(_items)<>'array' OR jsonb_array_length(_items)=0 THEN RAISE EXCEPTION 'At least one item is required'; END IF;
  IF _paid IS NULL OR _paid<0 OR _paid='NaN'::numeric THEN RAISE EXCEPTION 'Paid amount cannot be negative'; END IF;
  IF _bargaining_amount IS NOT NULL AND (_bargaining_amount<0 OR _bargaining_amount='NaN'::numeric) THEN RAISE EXCEPTION 'Bargaining amount cannot be negative'; END IF;
  IF coalesce(_method,'cash') NOT IN ('cash','upi','bank','cheque','credit') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;

  PERFORM 1 FROM public.customers WHERE id=_customer_id FOR UPDATE;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_items) AS t(value) LOOP
    v_variant_id:=NULLIF(v_item->>'product_variant_id','')::uuid;
    v_inventory_id:=NULLIF(v_item->>'inventory_id','')::uuid;
    v_product_id:=NULLIF(v_item->>'product_id','')::uuid;
    IF v_inventory_id IS NULL AND v_variant_id IS NOT NULL THEN
      SELECT pv.inventory_id INTO v_inventory_id FROM public.product_variants pv WHERE pv.id=v_variant_id;
    END IF;
    IF v_inventory_id IS NULL AND (v_product_id IS NOT NULL OR v_variant_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Inventory lot is required for product-backed Khata item';
    END IF;
    IF v_inventory_id IS NOT NULL THEN
      v_lock_ids:=array_append(v_lock_ids,v_inventory_id);
    END IF;
  END LOOP;

  FOR v_lock_id IN SELECT DISTINCT value FROM unnest(v_lock_ids) AS t(value) ORDER BY value LOOP
    PERFORM 1 FROM public.inventory_items WHERE id=v_lock_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item % not found',v_lock_id; END IF;
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_items) AS t(value) LOOP
    v_qty:=coalesce(NULLIF(v_item->>'entered_quantity','')::numeric,NULLIF(v_item->>'quantity','')::numeric,0);
    v_unit:=public.normalize_inventory_unit(coalesce(NULLIF(trim(v_item->>'entered_unit'),''),NULLIF(trim(v_item->>'unit'),''),'unit'));
    v_rate:=coalesce(NULLIF(v_item->>'rate','')::numeric,0);
    v_final_amount:=CASE WHEN NULLIF(v_item->>'final_amount','') IS NULL THEN NULL ELSE (v_item->>'final_amount')::numeric END;
    v_product_name:=coalesce(NULLIF(v_item->>'product',''),'Item');
    v_product_id:=NULLIF(v_item->>'product_id','')::uuid;
    v_inventory_id:=NULLIF(v_item->>'inventory_id','')::uuid;
    v_variant_id:=NULLIF(v_item->>'product_variant_id','')::uuid;

    IF v_qty<=0 OR v_qty='NaN'::numeric THEN RAISE EXCEPTION 'Quantity must be greater than zero for %',v_product_name; END IF;
    IF v_rate<0 OR v_rate='NaN'::numeric THEN RAISE EXCEPTION 'Selling rate cannot be negative for %',v_product_name; END IF;
    IF v_final_amount IS NOT NULL AND (v_final_amount<0 OR v_final_amount='NaN'::numeric) THEN RAISE EXCEPTION 'Final sale amount cannot be negative for %',v_product_name; END IF;

    IF v_variant_id IS NOT NULL THEN
      SELECT pv.product_id,pv.inventory_id INTO v_product_id,v_product_inventory_id
      FROM public.product_variants pv WHERE pv.id=v_variant_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Product variant % not found',v_variant_id; END IF;
      IF v_inventory_id IS NOT NULL AND v_product_inventory_id IS DISTINCT FROM v_inventory_id THEN
        RAISE EXCEPTION 'Product variant % does not belong to inventory lot %',v_variant_id,v_inventory_id;
      END IF;
      IF v_inventory_id IS NULL THEN v_inventory_id:=v_product_inventory_id; END IF;
    END IF;

    IF v_inventory_id IS NULL AND v_product_id IS NOT NULL THEN
      RAISE EXCEPTION 'Inventory lot is required for product-backed Khata item %',v_product_name;
    END IF;

    v_normalized_qty:=v_qty; v_inventory_unit:=v_unit; v_purchase_cost:=0; v_available:=NULL; v_allow_loose:=false; v_inventory_product_id:=NULL; v_product_inventory_id:=NULL;

    IF v_inventory_id IS NOT NULL THEN
      SELECT i.product_id,i.unit,i.quantity,i.purchase_price,i.allow_loose_sale
      INTO v_inventory_product_id,v_inventory_unit,v_available,v_purchase_cost,v_allow_loose
      FROM public.inventory_items i WHERE i.id=v_inventory_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found for %',v_product_name; END IF;

      v_inventory_unit:=public.normalize_inventory_unit(v_inventory_unit);
      IF v_product_id IS NULL THEN v_product_id:=v_inventory_product_id; END IF;
      IF v_inventory_product_id IS NOT NULL AND v_product_id IS NOT NULL AND v_inventory_product_id<>v_product_id THEN
        RAISE EXCEPTION 'Inventory lot % does not belong to product %',v_inventory_id,v_product_id;
      END IF;

      IF v_allow_loose THEN
        IF v_unit=v_inventory_unit THEN v_normalized_qty:=v_qty;
        ELSE v_normalized_qty:=public.convert_unit_quantity(v_qty,v_unit,v_inventory_unit); END IF;
      ELSIF v_unit<>v_inventory_unit OR v_qty<>trunc(v_qty) THEN
        RAISE EXCEPTION '% must be sold as complete % units',v_product_name,v_inventory_unit;
      END IF;

      IF v_normalized_qty<=0 OR v_normalized_qty='NaN'::numeric THEN RAISE EXCEPTION 'Quantity must be greater than zero for %',v_product_name; END IF;

      v_requested_total:=coalesce((v_requested_by_inventory->>v_inventory_id::text)::numeric,0)+v_normalized_qty;
      v_requested_by_inventory:=jsonb_set(v_requested_by_inventory,ARRAY[v_inventory_id::text],to_jsonb(v_requested_total),true);
      IF v_requested_total>v_available THEN
        RAISE EXCEPTION 'Insufficient stock for %: available % %, requested % %',v_product_name,round(v_available,6),v_inventory_unit,round(v_requested_total,6),v_inventory_unit;
      END IF;
    END IF;

    v_calculated_amount:=round(v_normalized_qty*v_rate,2);
    v_final_amount:=coalesce(v_final_amount,v_calculated_amount);
    v_subtotal:=v_subtotal+v_final_amount;
    v_count:=v_count+1;
  END LOOP;

  IF v_bargaining>v_subtotal THEN RAISE EXCEPTION 'Bargaining amount (%) cannot exceed sale subtotal (%)',v_bargaining,v_subtotal; END IF;
  v_final_total:=round(v_subtotal-v_bargaining,2);
  IF _paid>v_final_total THEN RAISE EXCEPTION 'Paid amount (%) cannot exceed final sale total (%)',_paid,v_final_total; END IF;

  SELECT coalesce(NULLIF(x->>'product',''),'Item') INTO v_summary FROM jsonb_array_elements(_items) AS x LIMIT 1;
  IF v_count>1 THEN v_summary:=v_summary||' + '||(v_count-1)||' more'; END IF;

  INSERT INTO public.customer_transactions(
    customer_id,entry_date,entry_type,product,quantity,subtotal,discount_amount,amount,payment,method,remarks
  )
  VALUES(_customer_id,coalesce(_entry_date,current_date),'sale',v_summary,v_count,v_subtotal,v_bargaining,v_final_total,_paid,coalesce(_method,'cash'),_remarks)
  RETURNING id INTO v_tx_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_items) AS t(value) LOOP
    v_qty:=coalesce(NULLIF(v_item->>'entered_quantity','')::numeric,NULLIF(v_item->>'quantity','')::numeric,0);
    v_unit:=public.normalize_inventory_unit(coalesce(NULLIF(trim(v_item->>'entered_unit'),''),NULLIF(trim(v_item->>'unit'),''),'unit'));
    v_rate:=coalesce(NULLIF(v_item->>'rate','')::numeric,0);
    v_final_amount:=CASE WHEN NULLIF(v_item->>'final_amount','') IS NULL THEN NULL ELSE (v_item->>'final_amount')::numeric END;
    v_product_name:=coalesce(NULLIF(v_item->>'product',''),'Item');
    v_product_id:=NULLIF(v_item->>'product_id','')::uuid;
    v_inventory_id:=NULLIF(v_item->>'inventory_id','')::uuid;
    v_variant_id:=NULLIF(v_item->>'product_variant_id','')::uuid;

    IF v_variant_id IS NOT NULL THEN
      SELECT pv.product_id,pv.inventory_id INTO v_product_id,v_product_inventory_id
      FROM public.product_variants pv WHERE pv.id=v_variant_id FOR UPDATE;
      IF v_inventory_id IS NULL THEN v_inventory_id:=v_product_inventory_id; END IF;
    END IF;
    IF v_inventory_id IS NULL AND v_product_id IS NOT NULL THEN
      RAISE EXCEPTION 'Inventory lot is required for product-backed Khata item %',v_product_name;
    END IF;

    v_normalized_qty:=v_qty; v_inventory_unit:=v_unit; v_purchase_cost:=0; v_allow_loose:=false;
    IF v_inventory_id IS NOT NULL THEN
      SELECT i.product_id,i.unit,i.purchase_price,i.allow_loose_sale
      INTO v_inventory_product_id,v_inventory_unit,v_purchase_cost,v_allow_loose
      FROM public.inventory_items i WHERE i.id=v_inventory_id;
      v_inventory_unit:=public.normalize_inventory_unit(v_inventory_unit);
      IF v_product_id IS NULL THEN v_product_id:=v_inventory_product_id; END IF;
      IF v_allow_loose THEN
        IF v_unit=v_inventory_unit THEN v_normalized_qty:=v_qty;
        ELSE v_normalized_qty:=public.convert_unit_quantity(v_qty,v_unit,v_inventory_unit); END IF;
      END IF;
    END IF;

    v_calculated_amount:=round(v_normalized_qty*v_rate,2);
    v_final_amount:=coalesce(v_final_amount,v_calculated_amount);
    v_realized_rate:=CASE WHEN v_normalized_qty=0 THEN 0 ELSE round(v_final_amount/v_normalized_qty,6) END;

    INSERT INTO public.customer_transaction_items(
      transaction_id,inventory_id,product_id,product_variant_id,product,quantity,unit,rate,amount,
      purchase_cost,admin_price_inc,entered_quantity,entered_unit,calculated_amount,final_sale_amount
    )
    VALUES(
      v_tx_id,v_inventory_id,v_product_id,v_variant_id,v_product_name,
      round(v_normalized_qty,6),v_inventory_unit,round(v_rate,6),round(v_final_amount,2),
      coalesce(v_purchase_cost,0),round(v_realized_rate,6),round(v_qty,6),v_unit,
      round(v_calculated_amount,2),round(v_final_amount,2)
    );

    IF v_inventory_id IS NOT NULL THEN
      UPDATE public.inventory_items
      SET quantity=round(greatest(quantity-v_normalized_qty,0),6),
          last_updated=coalesce(_entry_date,current_date),
          status=CASE WHEN quantity-v_normalized_qty<=0 THEN 'out-of-stock' ELSE status END
      WHERE id=v_inventory_id AND quantity>=v_normalized_qty;
      IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock for %',v_product_name; END IF;
    END IF;
  END LOOP;

  RETURN v_tx_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_khata_sale(
  _customer_id uuid,_items jsonb,_paid numeric DEFAULT 0,_method text DEFAULT 'cash',
  _entry_date date DEFAULT current_date,_remarks text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $function$
BEGIN
  RETURN public.create_khata_sale_with_bargaining(_customer_id,_items,_paid,0,_method,_entry_date,_remarks);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_khata_sale_with_bargaining(uuid,jsonb,numeric,numeric,text,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_khata_sale_with_bargaining(uuid,jsonb,numeric,numeric,text,date,text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_khata_sale(uuid,jsonb,numeric,text,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_khata_sale(uuid,jsonb,numeric,text,date,text) TO authenticated;

COMMIT;
-- Harden the unit helper functions used by the normalized Khata RPC.
ALTER FUNCTION public.convert_unit_quantity(numeric,text,text) SET search_path = public;
ALTER FUNCTION public.normalize_inventory_unit(text) SET search_path = public;
