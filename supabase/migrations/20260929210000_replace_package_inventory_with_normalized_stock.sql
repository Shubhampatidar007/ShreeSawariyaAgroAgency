-- Normalize operational inventory lots and the admin inventory linkage used by Khata sales.
-- Existing legacy audit columns are intentionally retained when present.
BEGIN;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS product_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='inventory_items_product_id_fkey') THEN
    ALTER TABLE public.inventory_items
      ADD CONSTRAINT inventory_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id ON public.inventory_items(product_id);

UPDATE public.inventory_items i
SET product_id=p.id
FROM public.products p
WHERE i.product_id IS NULL AND i.id=p.inventory_id;

UPDATE public.inventory_items i
SET product_id=pv.product_id
FROM public.product_variants pv
WHERE i.product_id IS NULL AND i.product_variant_id=pv.id AND pv.product_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_inventory_unit(_unit text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE v text:=lower(trim(coalesce(_unit,'')));
BEGIN
  v:=regexp_replace(v,'^[0-9]+(?:\.[0-9]+)?\s*','');
  v:=regexp_replace(v,'\s+(bag|bags|pack|packs|packet|packets|bottle|bottles)$','');
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

CREATE OR REPLACE FUNCTION public.inventory_stock_watch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $function$
DECLARE v_product_id uuid;
BEGIN
  v_product_id:=NEW.product_id;
  IF v_product_id IS NULL THEN
    SELECT p.id INTO v_product_id FROM public.products p WHERE p.inventory_id=NEW.id LIMIT 1;
    IF v_product_id IS NULL THEN
      SELECT pv.product_id INTO v_product_id FROM public.product_variants pv WHERE pv.inventory_id=NEW.id LIMIT 1;
    END IF;
  END IF;

  IF v_product_id IS NOT NULL THEN
    UPDATE public.products p
    SET stock=coalesce((
      SELECT sum(ii.quantity)
      FROM public.inventory_items ii
      WHERE ii.product_id=p.id
         OR (
           ii.product_id IS NULL
           AND (
             ii.id=p.inventory_id
             OR ii.product_variant_id IN (SELECT pv.id FROM public.product_variants pv WHERE pv.product_id=p.id)
           )
         )
    ),0), updated_at=now()
    WHERE p.id=v_product_id;
  END IF;

  IF NEW.quantity<=NEW.min_stock_level THEN
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
    DO UPDATE SET status='active',next_run=current_date,filter_summary=EXCLUDED.filter_summary,
      message=EXCLUDED.message,updated_at=now();

    INSERT INTO public.notifications(title,body,type,link,source_id)
    VALUES('Low stock alert',NEW.product_name||' is down to '||NEW.quantity||' '||NEW.unit,
      'warning','/admin/inventory',NEW.id);
  ELSE
    UPDATE public.reminders
    SET status='completed',updated_at=now()
    WHERE kind='low-stock' AND source_id=NEW.id AND status='active';
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_product_variant_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path=public
AS $function$
BEGIN
  IF NEW.product_variant_id IS NOT NULL THEN
    UPDATE public.product_variants
    SET stock=greatest(NEW.quantity,0),updated_at=now()
    WHERE id=NEW.product_variant_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS inventory_variant_stock_sync ON public.inventory_items;
CREATE TRIGGER inventory_variant_stock_sync
AFTER INSERT OR UPDATE OF quantity ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.sync_product_variant_stock();

DROP TRIGGER IF EXISTS t_inventory_stock_watch ON public.inventory_items;
CREATE TRIGGER t_inventory_stock_watch
AFTER INSERT OR UPDATE OF quantity,min_stock_level ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.inventory_stock_watch();

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
DECLARE
  v_inventory_id uuid; v_supplier_name text; v_product_id uuid; v_variant_id uuid;
  v_variant_inventory_id uuid; v_total numeric; v_advance numeric; v_due numeric; v_unit text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
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

  INSERT INTO public.inventory_items(
    product_name,supplier_id,supplier_name,quantity,unit,purchase_price,selling_price,
    min_stock_level,status,last_updated,allow_loose_sale
  )
  VALUES(
    _product_name,_supplier_id,v_supplier_name,round(_quantity,6),v_unit,
    round(_purchase_price_per_unit,6),
    CASE WHEN _reference_selling_price_per_unit IS NULL THEN NULL ELSE round(_reference_selling_price_per_unit,6) END,
    greatest(coalesce(_min_stock_level,0),0),'in-stock',coalesce(_entry_date,current_date),coalesce(_allow_loose_sale,false)
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

  UPDATE public.inventory_items SET product_id=v_product_id WHERE id=v_inventory_id;

  SELECT id,inventory_id INTO v_variant_id,v_variant_inventory_id
  FROM public.product_variants
  WHERE product_id=v_product_id AND lower(trim(label))=lower(trim(v_unit))
  ORDER BY CASE WHEN inventory_id IS NULL THEN 0 ELSE 1 END,created_at
  LIMIT 1 FOR UPDATE;

  IF v_variant_id IS NULL THEN
    INSERT INTO public.product_variants(product_id,inventory_id,label,selling_price,stock)
    VALUES(v_product_id,v_inventory_id,v_unit,
      coalesce(_reference_selling_price_per_unit,_purchase_price_per_unit),round(_quantity,6))
    RETURNING id INTO v_variant_id;

    UPDATE public.inventory_items SET product_variant_id=v_variant_id WHERE id=v_inventory_id;
  ELSIF v_variant_inventory_id IS NULL THEN
    UPDATE public.inventory_items SET product_variant_id=v_variant_id WHERE id=v_inventory_id;
  END IF;

  UPDATE public.products p
  SET stock=coalesce((
    SELECT sum(ii.quantity) FROM public.inventory_items ii
    WHERE ii.product_id=p.id
       OR (
         ii.product_id IS NULL
         AND (
           ii.id=p.inventory_id
           OR ii.product_variant_id IN (SELECT pv.id FROM public.product_variants pv WHERE pv.product_id=p.id)
         )
       )
  ),0),updated_at=now()
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
    _supplier_id,coalesce(_entry_date,current_date),'purchase',_product_name,v_total,v_due,
    'credit',NULL,v_inventory_id,_product_name,round(_quantity,6),v_unit,round(_purchase_price_per_unit,6)
  );

  IF v_advance>0 THEN
    INSERT INTO public.supplier_transactions(
      supplier_id,entry_date,entry_type,reference,amount,balance,method,remarks,
      inventory_item_id,product_name,quantity,unit,rate
    )
    VALUES(
      _supplier_id,coalesce(_entry_date,current_date),'advance','ADV-'||left(v_inventory_id::text,8),
      v_advance,v_due,coalesce(_advance_method,'cash'),'Advance paid against inventory purchase',
      v_inventory_id,_product_name,round(_quantity,6),v_unit,round(_purchase_price_per_unit,6)
    );
  END IF;

  RETURN v_inventory_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_inventory_lot_purchase(uuid,text,numeric,text,numeric,numeric,boolean,numeric,date,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_inventory_lot_purchase(uuid,text,numeric,text,numeric,numeric,boolean,numeric,date,numeric,text) TO authenticated;

COMMIT;
