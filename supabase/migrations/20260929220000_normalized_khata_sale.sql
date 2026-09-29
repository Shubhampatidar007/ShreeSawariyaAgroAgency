-- Update Khata sales to consume normalized inventory lots directly.
-- The historical customer_transaction_items columns remain as audit snapshots.
BEGIN;

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
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_inventory_id uuid;
  v_product_name text;
  v_qty numeric;
  v_unit text;
  v_inventory_unit text;
  v_rate numeric;
  v_normalized_qty numeric;
  v_final_amount numeric;
  v_calculated_amount numeric;
  v_realized_rate numeric;
  v_purchase_cost numeric;
  v_available numeric;
  v_allow_loose boolean;
  v_subtotal numeric:=0;
  v_bargaining numeric:=greatest(coalesce(_bargaining_amount,0),0);
  v_final_total numeric:=0;
  v_count integer:=0;
  v_tx_id uuid;
  v_summary text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id=_customer_id) THEN RAISE EXCEPTION 'Customer not found'; END IF;
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
      SELECT pv.product_id,pv.inventory_id INTO v_product_id,v_inventory_id
      FROM public.product_variants pv WHERE pv.id=v_variant_id FOR UPDATE;
    END IF;
    IF v_inventory_id IS NULL AND v_product_id IS NOT NULL THEN
      SELECT inventory_id INTO v_inventory_id FROM public.products WHERE id=v_product_id FOR UPDATE;
    END IF;

    v_normalized_qty:=v_qty;
    v_inventory_unit:=v_unit;
    v_purchase_cost:=0;
    v_available:=NULL;
    v_allow_loose:=false;

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

      IF v_normalized_qty<=0 OR v_normalized_qty>v_available THEN
        RAISE EXCEPTION 'Insufficient stock for %: available % %, requested % %',
          v_product_name,v_available,v_inventory_unit,v_normalized_qty,v_inventory_unit;
      END IF;
    END IF;

    v_calculated_amount:=round(v_normalized_qty*v_rate,2);
    v_final_amount:=coalesce(v_final_amount,v_calculated_amount);
    IF v_final_amount<0 THEN RAISE EXCEPTION 'Final sale amount cannot be negative for %',v_product_name; END IF;
    v_subtotal:=v_subtotal+v_final_amount;
    v_count:=v_count+1;
  END LOOP;

  IF v_bargaining>v_subtotal THEN RAISE EXCEPTION 'Bargaining amount (%) cannot exceed sale subtotal (%)',v_bargaining,v_subtotal; END IF;
  v_final_total:=round(v_subtotal-v_bargaining,2);
  IF _paid>v_final_total THEN RAISE EXCEPTION 'Paid amount (%) cannot exceed final sale total (%)',_paid,v_final_total; END IF;

  SELECT coalesce(nullif(x->>'product',''),'Item') INTO v_summary
  FROM jsonb_array_elements(_items) x LIMIT 1;
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
    v_purchase_cost:=0;
    v_normalized_qty:=v_qty;
    v_inventory_unit:=v_unit;
    v_available:=NULL;
    v_allow_loose:=false;

    IF v_variant_id IS NOT NULL THEN
      SELECT pv.product_id,pv.inventory_id INTO v_product_id,v_inventory_id
      FROM public.product_variants pv WHERE pv.id=v_variant_id;
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
          status=CASE WHEN quantity-v_normalized_qty<=0 THEN 'out-of-stock' ELSE status END
      WHERE id=v_inventory_id AND quantity>=v_normalized_qty;
      IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock for %',v_product_name; END IF;

      UPDATE public.products p
      SET stock=coalesce((
        SELECT sum(i.quantity) FROM public.inventory_items i
        WHERE i.id=p.inventory_id
           OR i.product_variant_id IN (SELECT pv.id FROM public.product_variants pv WHERE pv.product_id=p.id)
      ),0),updated_at=now()
      WHERE p.id=v_product_id;
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