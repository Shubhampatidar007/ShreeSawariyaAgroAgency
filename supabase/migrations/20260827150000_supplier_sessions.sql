create table if not exists public.supplier_sessions (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  session_code text not null unique,
  session_date date not null default current_date,
  started_at timestamptz not null default now(),
  notes text,
  delivery_count integer not null default 0,
  total_purchase numeric not null default 0,
  total_advance numeric not null default 0,
  total_due numeric not null default 0,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_sessions_delivery_count_check check (delivery_count >= 0),
  constraint supplier_sessions_amounts_check check (total_purchase >= 0 and total_advance >= 0 and total_due >= 0)
);

alter table public.inventory_items add column if not exists session_id uuid references public.supplier_sessions(id) on delete set null;
alter table public.supplier_transactions add column if not exists session_id uuid references public.supplier_sessions(id) on delete set null;

create index if not exists supplier_sessions_supplier_started_idx on public.supplier_sessions(supplier_id, started_at desc);
create index if not exists supplier_sessions_date_idx on public.supplier_sessions(session_date desc);
create index if not exists inventory_items_session_idx on public.inventory_items(session_id);
create index if not exists supplier_transactions_session_idx on public.supplier_transactions(session_id);

alter table public.supplier_sessions enable row level security;
drop policy if exists "supplier sessions staff read" on public.supplier_sessions;
create policy "supplier sessions staff read"
  on public.supplier_sessions for select to authenticated
  using ((select private.is_staff()));
grant select on public.supplier_sessions to authenticated;

drop function if exists public.record_supplier_purchase_session(uuid, jsonb, numeric, text, date, text, timestamptz);
create or replace function public.record_supplier_purchase_session(
  _supplier_id uuid,
  _deliveries jsonb,
  _advance_paid numeric default 0,
  _advance_method text default 'cash',
  _entry_date date default current_date,
  _notes text default null,
  _started_at timestamptz default now()
)
returns uuid language plpgsql security definer set search_path to 'public'
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

    insert into public.inventory_items (product_name, supplier_id, supplier_name, quantity, unit, purchase_price, total_price, min_stock_level, status, last_updated, session_id)
    values (v_product_name, _supplier_id, v_supplier_name, v_quantity, v_unit, v_rate, v_quantity * v_rate, v_min_stock, case when v_quantity > 0 then 'in-stock' else 'out-of-stock' end, coalesce(_entry_date, current_date), v_session_id)
    returning id into v_inventory_id;

    update public.suppliers
    set total_purchases = total_purchases + (v_quantity * v_rate), due_balance = due_balance + (v_quantity * v_rate), last_order = coalesce(_entry_date, current_date), updated_at = now()
    where id = _supplier_id;

    v_due := (select due_balance from public.suppliers where id = _supplier_id);
    insert into public.supplier_transactions (supplier_id, entry_date, entry_type, reference, amount, balance, method, remarks, inventory_item_id, product_name, quantity, unit, rate, session_id)
    values (_supplier_id, coalesce(_entry_date, current_date), 'purchase', v_product_name, v_quantity * v_rate, v_due, 'credit', null, v_inventory_id, v_product_name, v_quantity, v_unit, v_rate, v_session_id);
  end loop;

  if v_advance > 0 then
    update public.suppliers
    set total_paid = total_paid + v_advance, due_balance = greatest(due_balance - v_advance, 0), updated_at = now()
    where id = _supplier_id;
    v_due := (select due_balance from public.suppliers where id = _supplier_id);
    insert into public.supplier_transactions (supplier_id, entry_date, entry_type, reference, amount, balance, method, remarks, session_id, product_name, quantity, unit, rate)
    values (_supplier_id, coalesce(_entry_date, current_date), 'advance', 'ADV-' || upper(substr(replace(v_session_id::text, '-', ''), 1, 8)), v_advance, v_due, _advance_method, 'Advance paid against supplier session', v_session_id, '', 0, 'session', 0);
  end if;

  update public.supplier_sessions
  set delivery_count = jsonb_array_length(_deliveries), total_purchase = v_total_purchase, total_advance = v_advance, total_due = greatest(v_total_purchase - v_advance, 0), status = 'closed', updated_at = now()
  where id = v_session_id;

  return v_session_id;
end;
$function$;

-- Preserve history: one session per existing inventory record, then connect its ledger rows.
do $$
declare
  v_item record;
  v_session_id uuid;
  v_supplier_name text;
  v_base text;
  v_code text;
  v_purchase numeric;
  v_advance numeric;
begin
  for v_item in select i.*, coalesce(i.created_at, i.updated_at, now()) as recorded_at from public.inventory_items i where i.session_id is null order by i.created_at, i.id loop
    select company into v_supplier_name from public.suppliers where id = v_item.supplier_id;
    v_base := regexp_replace(lower(trim(coalesce(v_supplier_name, v_item.supplier_name, 'supplier'))), '[^a-z0-9]+', '_', 'g');
    v_base := regexp_replace(v_base, '^_+|_+$', '', 'g');
    v_code := coalesce(nullif(v_base, ''), 'supplier') || '_' || to_char(v_item.recorded_at at time zone 'Asia/Kolkata', 'HH24MI');
    if exists (select 1 from public.supplier_sessions where session_code = v_code) then v_code := v_code || '_' || substr(replace(v_item.id::text, '-', ''), 1, 4); end if;
    v_purchase := coalesce(v_item.total_price, v_item.quantity * v_item.purchase_price, 0);
    select coalesce(sum(amount), 0) into v_advance from public.supplier_transactions where inventory_item_id = v_item.id and entry_type = 'advance';
    insert into public.supplier_sessions (supplier_id, session_code, session_date, started_at, notes, delivery_count, total_purchase, total_advance, total_due, status)
    values (v_item.supplier_id, v_code, coalesce(v_item.last_updated, v_item.created_at::date, current_date), v_item.recorded_at, 'Migrated from historical inventory record', 1, greatest(v_purchase, 0), greatest(v_advance, 0), greatest(v_purchase - v_advance, 0), 'closed')
    returning id into v_session_id;
    update public.inventory_items set session_id = v_session_id where id = v_item.id;
    update public.supplier_transactions set session_id = v_session_id where inventory_item_id = v_item.id;
  end loop;
end $$;
