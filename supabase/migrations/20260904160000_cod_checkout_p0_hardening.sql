-- P0: anonymous COD checkout abuse protection, idempotency and atomic stock mutation.
-- Public checkout remains available; all security decisions are server-side.

ALTER TABLE private.cod_checkout_rate_limits
  ADD COLUMN IF NOT EXISTS device_key text;

CREATE INDEX IF NOT EXISTS cod_checkout_rate_limits_device_created_idx
  ON private.cod_checkout_rate_limits (device_key, created_at DESC);

CREATE TABLE IF NOT EXISTS private.cod_checkout_idempotency (
  idempotency_hash text PRIMARY KEY,
  payload_hash text NOT NULL,
  mobile text NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_code text NOT NULL,
  order_total numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON private.cod_checkout_idempotency FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS cod_checkout_idempotency_created_idx
  ON private.cod_checkout_idempotency (created_at DESC);

REVOKE EXECUTE ON FUNCTION public.place_cod_order(text,text,text,text,text,jsonb,text) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.place_cod_order(text,text,text,text,text,jsonb,text);

CREATE OR REPLACE FUNCTION public.place_cod_order(
  _customer_name text,
  _mobile text,
  _village text,
  _address text,
  _pincode text,
  _items jsonb,
  _remarks text DEFAULT NULL::text,
  _idempotency_key text DEFAULT NULL::text
)
RETURNS TABLE(order_id uuid, order_code text, order_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog, public, private'
AS $function$
DECLARE
  _order_id uuid; _order_code text; _subtotal numeric(12,2):=0; _item jsonb; _product public.products%ROWTYPE;
  _qty numeric(12,2); _total_qty numeric(12,2); _rate numeric(12,2); _amount numeric(12,2); _inventory_quantity numeric(12,2);
  _normalized_mobile text; _client_ip inet; _device_key text; _idempotency_hash text; _payload_hash text;
  _existing_payload_hash text; _existing_mobile text; _existing_order_id uuid; _existing_order_code text; _existing_order_total numeric;
  _recent_mobile_orders integer; _recent_ip_orders integer; _recent_device_orders integer; _headers jsonb;
BEGIN
  _headers:=COALESCE(NULLIF(current_setting('request.headers',true),'')::jsonb,'{}'::jsonb);
  _normalized_mobile:=regexp_replace(COALESCE(_mobile,''),'\\D','','g');
  _idempotency_key:=NULLIF(trim(COALESCE(_idempotency_key,_headers->>'x-idempotency-key','')),'');
  _client_ip:=NULLIF(split_part(COALESCE(_headers->>'x-forwarded-for',''),',',1),'')::inet;
  _device_key:=NULLIF(trim(COALESCE(_headers->>'x-device-id','')),'');
  IF _device_key IS NULL THEN _device_key:=encode(digest(COALESCE(_headers->>'user-agent','')||'|'||COALESCE(_client_ip::text,''),'sha256'),'hex'); END IF;

  DELETE FROM private.cod_checkout_rate_limits WHERE created_at<now()-interval '2 hours';
  PERFORM pg_advisory_xact_lock(hashtextextended('cod-device:'||_device_key,0));
  IF _client_ip IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended('cod-ip:'||_client_ip::text,0)); END IF;
  SELECT count(*) INTO _recent_device_orders FROM private.cod_checkout_rate_limits WHERE device_key=_device_key AND created_at>now()-interval '1 hour';
  IF _recent_device_orders>=10 THEN RAISE EXCEPTION 'Too many checkout attempts from this device. Please try again later'; END IF;
  IF _client_ip IS NOT NULL THEN
    SELECT count(*) INTO _recent_ip_orders FROM private.cod_checkout_rate_limits WHERE client_ip=_client_ip AND created_at>now()-interval '1 hour';
    IF _recent_ip_orders>=10 THEN RAISE EXCEPTION 'Too many checkout attempts from this network. Please try again later'; END IF;
  END IF;
  INSERT INTO private.cod_checkout_rate_limits(mobile,client_ip,device_key)
  VALUES(CASE WHEN _normalized_mobile~'^[0-9]{10}$' THEN _normalized_mobile ELSE '__invalid__' END,_client_ip,_device_key);

  IF COALESCE(trim(_customer_name),'')='' THEN RAISE EXCEPTION 'Customer name is required'; END IF;
  IF _normalized_mobile !~ '^[0-9]{10}$' THEN RAISE EXCEPTION 'Enter a valid 10 digit mobile number'; END IF;
  IF COALESCE(trim(_address),'')='' THEN RAISE EXCEPTION 'Delivery address is required'; END IF;
  IF COALESCE(trim(_pincode),'') !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'Enter a valid 6 digit pincode'; END IF;
  IF jsonb_typeof(_items)<>'array' OR jsonb_array_length(_items)=0 OR jsonb_array_length(_items)>20 THEN RAISE EXCEPTION 'Cart must contain between 1 and 20 items'; END IF;
  IF _idempotency_key IS NULL OR length(_idempotency_key)<16 OR length(_idempotency_key)>128 THEN RAISE EXCEPTION 'A valid checkout idempotency key is required'; END IF;

  _idempotency_hash:=encode(digest(_idempotency_key,'sha256'),'hex');
  _payload_hash:=encode(digest(COALESCE(trim(_customer_name),'')||E'\x1f'||_normalized_mobile||E'\x1f'||COALESCE(trim(_village),'')||E'\x1f'||COALESCE(trim(_address),'')||E'\x1f'||COALESCE(trim(_pincode),'')||E'\x1f'||COALESCE(_items::text,'')||E'\x1f'||COALESCE(trim(_remarks),''),'sha256'),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended('cod-idempotency:'||_idempotency_hash,0));
  SELECT payload_hash,mobile,order_id,order_code,order_total INTO _existing_payload_hash,_existing_mobile,_existing_order_id,_existing_order_code,_existing_order_total FROM private.cod_checkout_idempotency WHERE idempotency_hash=_idempotency_hash FOR UPDATE;
  IF FOUND THEN
    IF _existing_payload_hash<>_payload_hash OR _existing_mobile<>_normalized_mobile THEN RAISE EXCEPTION 'Idempotency key was already used for a different checkout'; END IF;
    RETURN QUERY SELECT _existing_order_id,_existing_order_code,_existing_order_total; RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('cod-mobile:'||_normalized_mobile,0));
  SELECT count(*) INTO _recent_mobile_orders FROM private.cod_checkout_rate_limits WHERE mobile=_normalized_mobile AND created_at>now()-interval '1 hour';
  IF _recent_mobile_orders>=3 THEN RAISE EXCEPTION 'Too many checkout attempts for this mobile number. Please try again later'; END IF;

  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    IF NULLIF(_item->>'id','') IS NULL THEN RAISE EXCEPTION 'Invalid cart item'; END IF;
    _qty:=COALESCE((_item->>'qty')::numeric,0); IF _qty<=0 OR _qty>1000 THEN RAISE EXCEPTION 'Invalid quantity for cart item'; END IF;
    SELECT COALESCE(SUM((value->>'qty')::numeric),0) INTO _total_qty FROM jsonb_array_elements(_items) WHERE value->>'id'=_item->>'id';
    IF _total_qty>1000 THEN RAISE EXCEPTION 'Quantity exceeds allowed limit'; END IF;
    SELECT * INTO _product FROM public.products WHERE id=(_item->>'id')::uuid AND visibility='public' AND status='published' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'One of the products is no longer available'; END IF;
    IF _product.stock<_total_qty THEN RAISE EXCEPTION 'Insufficient stock for %',_product.title; END IF;
    _rate:=COALESCE(_product.discount_price,_product.selling_price); IF _rate IS NULL OR _rate<0 THEN RAISE EXCEPTION 'Invalid product price'; END IF;
    _amount:=round(_rate*_qty,2); _subtotal:=_subtotal+_amount; IF _subtotal>500000 THEN RAISE EXCEPTION 'Order amount exceeds allowed limit'; END IF;
  END LOOP;

  _order_id:=gen_random_uuid(); _order_code:='SSA-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  INSERT INTO public.orders(id,code,channel,customer_name,customer_type,village,mobile,delivery_address,pincode,subtotal,discount,tax,total,paid,payment_method,payment_status,delivery_status,order_status,invoice_status,remarks,timeline)
  VALUES(_order_id,_order_code,'online',trim(_customer_name),'guest',COALESCE(trim(_village),''),_normalized_mobile,trim(_address),trim(_pincode),_subtotal,0,0,_subtotal,0,'cod','pending','scheduled','pending','not-generated',NULLIF(trim(COALESCE(_remarks,'')),''),jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'label','Order placed','at',now())));

  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    _qty:=(_item->>'qty')::numeric; SELECT * INTO _product FROM public.products WHERE id=(_item->>'id')::uuid AND visibility='public' AND status='published' FOR UPDATE;
    _rate:=COALESCE(_product.discount_price,_product.selling_price); _amount:=round(_rate*_qty,2);
    INSERT INTO public.order_items(order_id,product_id,product,quantity,unit,rate,amount) VALUES(_order_id,_product.id,_product.title,_qty,_product.category,_rate,_amount);
    IF _product.inventory_id IS NOT NULL THEN
      SELECT quantity INTO _inventory_quantity FROM public.inventory_items WHERE id=_product.inventory_id FOR UPDATE;
      IF NOT FOUND OR _inventory_quantity<_qty THEN RAISE EXCEPTION 'Insufficient inventory stock for %',_product.title; END IF;
      UPDATE public.inventory_items SET quantity=quantity-_qty,last_updated=current_date,updated_at=now(),status=CASE WHEN quantity-_qty<=0 THEN 'out-of-stock' ELSE status END WHERE id=_product.inventory_id;
    END IF;
    UPDATE public.products SET stock=stock-_qty,updated_at=now() WHERE id=_product.id;
  END LOOP;

  INSERT INTO private.cod_checkout_idempotency(idempotency_hash,payload_hash,mobile,order_id,order_code,order_total) VALUES(_idempotency_hash,_payload_hash,_normalized_mobile,_order_id,_order_code,_subtotal);
  RETURN QUERY SELECT _order_id,_order_code,_subtotal;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.place_cod_order(text,text,text,text,text,jsonb,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_cod_order(text,text,text,text,text,jsonb,text,text) TO anon,authenticated;
