-- Fix supplier session purchase RPC: inventory_items.total_price is a generated column.
-- Do not insert an explicit value into total_price.

create or replace function public.record_supplier_purchase_session(
  _supplier_id uuid,
  _deliveries jsonb,
  _advance_paid numeric default 0,
  _advance_method text default 'cash',
  _entry_date date default current_date,
  _notes text default null,
  _started_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_supplier_name text;
  v_session_id uuid;
  v_session_code text;
  v_base_code text;
  v_started_at timestamptz := coalesce(_started_at, now());
  v_total_purchase numeric := 0;
  v_advance numeric := greatest(coalesce(_advance_paid, 0), 0);
  v_due numeric := 0;
  v_inventory_id uuid;
  v_delivery jsonb;
  v_product_name text;
  v_quantity numeric;
  v_unit text;
  v_rate numeric;
  v_min_stock numeric;
  v_exists boolean;
begin
  if not (select private.is_staff()) then raise exception 'Not authorized'; end if;
  if not exists (select 1 from public.suppliers where id = _supplier_id) then raise exception 'Supplier not found'; end if;
  if _deliveries is null or jsonb_typeof(_deliveries) <> 'array' or jsonb_array_length(_deliveries) = 0 then raise exception 'At least one delivery is required'; end if;
  if _advance_method not in ('cash', 'upi', 'bank', 'cheque') then raise exception 'Invalid advance payment method'; end if;

  select company into v_supplier_name from public.suppliers where id = _supplier_id for update;

  v_base_code := regexp_replace(lower(trim(v_supplier_name)), '[^a-z0-9]+', '_', 'g');
  v_base_code := regexp_replace(v_base_code, '^_+|_+$', '', 'g');
  v_base_code := coalesce(nullif(v_base_code, ''), 'supplier') || '_' || to_char(v_started_at at time zone 'Asia/Kolkata', 'HH24MI');
  v_session_code := v_base_code;
  v_exists := exists (select 1 from public.supplier_sessions where session_code = v_session_code);
  if v_exists then v_session_code := v_base_code || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4); end if;

  insert into public.supplier_sessions (supplier_id, session_code, session_date, started_at, notes, status)
  values (_supplier_id, v_session_code, coalesce(_entry_date, current_date), v_started_at, nullif(trim(_notes), ''), 'open')
  returning id into v_session_id;

  for v_delivery in select value from jsonb_array_elements(_deliveries) loop
    v_product_name := coalesce(nullif(trim(v_delivery->>'product_name'), ''), '');
    v_quantity := coalesce(nullif(v_delivery->>'quantity', '')::numeric, 0);
    v_unit := trim(coalesce(v_delivery->>'unit', ''));
    v_rate := coalesce(nullif(v_delivery->>'purchase_price', '')::numeric, 0);
    if v_product_name = '' then raise exception 'Product name is required'; end if;
    if v_quantity <= 0 then raise exception 'Quantity must be greater than zero for %', v_product_name; end if;
    if v_unit = '' then raise exception 'Unit is required for %', v_product_name; end if;
    if v_rate < 0 then raise exception 'Purchase price cannot be negative for %', v_product_name; end if;
    v_total_purchase := v_total_purchase + (v_quantity * v_rate);
  end loop;

  if v_advance > v_total_purchase then raise exception 'Advance paid cannot exceed total purchase value'; end if;

  for v_delivery in select value from jsonb_array_elements(_deliveries) loop
    v_product_name := trim(v_delivery->>'product_name');
    v_quantity := (v_delivery->>'quantity')::numeric;
    v_unit := trim(v_delivery->>'unit');
    v_rate := (v_delivery->>'purchase_price')::numeric;
    v_min_stock := greatest(coalesce(nullif(v_delivery->>'min_stock_level', '')::numeric, 0), 0);

    insert into public.inventory_items (
      product_name,
      supplier_id,
      supplier_name,
      quantity,
      unit,
      purchase_price,
      min_stock_level,
      status,
      last_updated,
      session_id
    ) values (
      v_product_name,
      _supplier_id,
      v_supplier_name,
      v_quantity,
      v_unit,
      v_rate,
      v_min_stock,
      case when v_quantity > 0 then 'in-stock' else 'out-of-stock' end,
      coalesce(_entry_date, current_date),
      v_session_id
    )
    returning id into v_inventory_id;

    update public.suppliers
    set total_purchases = total_purchases + (v_quantity * v_rate),
        due_balance = due_balance + (v_quantity * v_rate),
        last_order = coalesce(_entry_date, current_date),
        updated_at = now()
    where id = _supplier_id;

    v_due := (select due_balance from public.suppliers where id = _supplier_id);

    insert into public.supplier_transactions (
      supplier_id,
      entry_date,
      entry_type,
      reference,
      amount,
      balance,
      method,
      remarks,
      inventory_item_id,
      product_name,
      quantity,
      unit,
      rate,
      session_id
    ) values (
      _supplier_id,
      coalesce(_entry_date, current_date),
      'purchase',
      v_product_name,
      v_quantity * v_rate,
      v_due,
      'credit',
      null,
      v_inventory_id,
      v_product_name,
      v_quantity,
      v_unit,
      v_rate,
      v_session_id
    );
  end loop;

  if v_advance > 0 then
    update public.suppliers
    set total_paid = total_paid + v_advance,
        due_balance = greatest(due_balance - v_advance, 0),
        updated_at = now()
    where id = _supplier_id;

    v_due := (select due_balance from public.suppliers where id = _supplier_id);

    insert into public.supplier_transactions (
      supplier_id,
      entry_date,
      entry_type,
      reference,
      amount,
      balance,
      method,
      remarks,
      session_id,
      product_name,
      quantity,
      unit,
      rate
    ) values (
      _supplier_id,
      coalesce(_entry_date, current_date),
      'advance',
      'ADV-' || upper(substr(replace(v_session_id::text, '-', ''), 1, 8)),
      v_advance,
      v_due,
      _advance_method,
      'Advance paid against supplier session',
      v_session_id,
      '',
      0,
      'session',
      0
    );
  end if;

  update public.supplier_sessions
  set delivery_count = jsonb_array_length(_deliveries),
      total_purchase = v_total_purchase,
      total_advance = v_advance,
      total_due = greatest(v_total_purchase - v_advance, 0),
      status = 'closed',
      updated_at = now()
  where id = v_session_id;

  return v_session_id;
end;
$function$;
