-- Support custom line items in the authenticated customer checkout without creating
-- fake product or variant rows. Catalog IDs remain authoritative for real products;
-- custom rows intentionally use NULL foreign keys and carry their snapshot name/price.
CREATE OR REPLACE FUNCTION public.create_customer_order(
  _items jsonb,
  _customer_id uuid DEFAULT NULL::uuid,
  _customer_name text DEFAULT ''::text,
  _mobile text DEFAULT ''::text,
  _village text DEFAULT ''::text,
  _delivery_address text DEFAULT ''::text,
  _payment_method text DEFAULT 'cash_on_delivery'::text,
  _remarks text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_item jsonb;
  v_order_id uuid;
  v_code text;
  v_customer_id uuid;
  v_product_id uuid;
  v_variant_id uuid;
  v_inventory_id uuid;
  v_product text;
  v_unit text;
  v_qty numeric;
  v_rate numeric;
  v_purchase_cost numeric;
  v_available numeric;
  v_is_custom boolean;
  v_subtotal numeric := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  if _customer_id is not null then
    select id into v_customer_id
    from public.customers
    where id = _customer_id and (user_id = auth.uid() or public.is_staff(auth.uid()));
    if v_customer_id is null then raise exception 'Customer not found or not authorized'; end if;
  else
    select id into v_customer_id from public.customers
    where user_id = auth.uid() order by created_at limit 1;
  end if;

  if _items is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'At least one item is required';
  end if;

  for v_item in select * from jsonb_array_elements(_items) loop
    v_is_custom := coalesce(nullif(v_item->>'is_custom', '')::boolean, false);
    v_qty := coalesce(nullif(v_item->>'quantity', '')::numeric, 0);
    if v_qty <= 0 then raise exception 'Quantity must be greater than zero'; end if;

    if v_is_custom then
      v_product_id := null;
      v_variant_id := null;
      v_inventory_id := null;
      v_product := trim(coalesce(v_item->>'product', ''));
      v_unit := trim(coalesce(nullif(v_item->>'unit', ''), 'unit'));
      v_rate := round(nullif(trim(v_item->>'rate'), '')::numeric, 2);

      if v_product = '' then raise exception 'Custom item name is required'; end if;
      if v_rate is null or v_rate < 0 then raise exception 'Custom item price must be zero or greater'; end if;
      v_purchase_cost := 0;
    else
      v_variant_id := nullif(v_item->>'product_variant_id', '')::uuid;
      if v_variant_id is null then raise exception 'Every online order item must have a product variant'; end if;

      select pv.product_id, pv.inventory_id, pv.stock, pv.label,
             coalesce(pv.discount_price, pv.selling_price)
      into v_product_id, v_inventory_id, v_available, v_unit, v_rate
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = v_variant_id
        and pv.status = 'active'
        and p.visibility = 'public'
        and p.status = 'published'
      for update;

      if v_product_id is null then raise exception 'Product variant is unavailable'; end if;
      if v_available < v_qty then
        raise exception 'Insufficient stock for selected variant: available %, requested %', v_available, v_qty;
      end if;

      if v_inventory_id is not null then
        select quantity, purchase_price into v_available, v_purchase_cost
        from public.inventory_items where id = v_inventory_id for update;
        if v_available is null or v_available < v_qty then
          raise exception 'Insufficient inventory stock for selected variant'; end if;
      else
        v_purchase_cost := 0;
      end if;
    end if;

    v_subtotal := v_subtotal + (v_qty * v_rate);
  end loop;

  v_code := 'ORD-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS')
    || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.orders (
    code, channel, customer_id, customer_name, customer_type, village, mobile,
    delivery_address, placed_on, subtotal, discount, tax, total, paid,
    payment_method, payment_status, delivery_status, order_status, invoice_status,
    remarks, timeline
  )
  values (
    v_code, 'online', v_customer_id,
    coalesce(nullif(_customer_name, ''), (select name from public.customers where id = v_customer_id), ''),
    case when v_customer_id is null then 'guest' else 'customer' end,
    coalesce(_village, ''), coalesce(_mobile, ''), coalesce(_delivery_address, ''), now(),
    v_subtotal, 0, 0, v_subtotal, 0,
    coalesce(nullif(_payment_method, ''), 'cash_on_delivery'),
    'pending', 'pending', 'pending', 'generated', _remarks,
    jsonb_build_array(jsonb_build_object('status','pending','at',now(),'note','Order placed'))
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(_items) loop
    v_is_custom := coalesce(nullif(v_item->>'is_custom', '')::boolean, false);
    v_qty := (v_item->>'quantity')::numeric;

    if v_is_custom then
      v_product_id := null;
      v_variant_id := null;
      v_inventory_id := null;
      v_product := trim(coalesce(v_item->>'product', ''));
      v_unit := trim(coalesce(nullif(v_item->>'unit', ''), 'unit'));
      v_rate := round(nullif(trim(v_item->>'rate'), '')::numeric, 2);
      v_purchase_cost := 0;
    else
      v_variant_id := nullif(v_item->>'product_variant_id', '')::uuid;

      select pv.product_id, pv.inventory_id, pv.label,
             coalesce(pv.discount_price, pv.selling_price),
             p.title
      into v_product_id, v_inventory_id, v_unit, v_rate, v_product
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = v_variant_id
      for update;

      if v_product_id is null then raise exception 'Product variant is unavailable'; end if;

      if v_inventory_id is not null then
        select purchase_price into v_purchase_cost
        from public.inventory_items
        where id = v_inventory_id for update;
        v_purchase_cost := coalesce(v_purchase_cost, 0);
      else
        v_purchase_cost := 0;
      end if;
    end if;

    insert into public.order_items (
      order_id, product_id, product_variant_id, product, quantity, unit, rate, amount, purchase_cost
    )
    values (
      v_order_id, v_product_id, v_variant_id, v_product, v_qty, v_unit, v_rate,
      round(v_qty * v_rate, 2), v_purchase_cost
    );

    if not v_is_custom and v_inventory_id is not null then
      update public.inventory_items
      set quantity = quantity - v_qty,
          last_updated = current_date,
          status = case when quantity - v_qty <= 0 then 'out-of-stock' else status end
      where id = v_inventory_id;
    elsif not v_is_custom then
      update public.product_variants
      set stock = stock - v_qty, updated_at = now()
      where id = v_variant_id;
    end if;
  end loop;

  update public.products p
  set stock = (select coalesce(sum(pv.stock), 0) from public.product_variants pv where pv.product_id = p.id)
  where exists (
    select 1 from public.order_items oi where oi.order_id = v_order_id and oi.product_id = p.id
  );

  return v_order_id;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_customer_order(jsonb, uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_order(jsonb, uuid, text, text, text, text, text, text) TO authenticated;
