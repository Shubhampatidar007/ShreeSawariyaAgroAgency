-- Product variants keep one product identity while allowing multiple pack sizes,
-- prices and stock quantities. Existing inventory/products remain compatible.

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  inventory_id uuid references public.inventory_items(id) on delete set null,
  label text not null,
  selling_price numeric not null default 0,
  discount_price numeric,
  stock numeric not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_nonnegative_prices check (selling_price >= 0 and (discount_price is null or discount_price >= 0)),
  constraint product_variants_nonnegative_stock check (stock >= 0)
);

create unique index if not exists product_variants_product_label_uidx
  on public.product_variants(product_id, lower(trim(label)))
  where product_id is not null;
create index if not exists product_variants_inventory_idx on public.product_variants(inventory_id);
create index if not exists product_variants_product_idx on public.product_variants(product_id);

alter table public.inventory_items add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null;
alter table public.customer_transaction_items add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null;
alter table public.order_items add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null;

alter table public.product_variants enable row level security;
drop policy if exists "product variants public read" on public.product_variants;
drop policy if exists "product variants staff manage" on public.product_variants;
create policy "product variants public read"
  on public.product_variants for select to anon, authenticated
  using (
    product_id is not null and exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.visibility = 'public'
        and p.status = 'published'
    )
  );
create policy "product variants staff manage"
  on public.product_variants for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;

create or replace function public.sync_product_variant_stock()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.product_variant_id is not null then
    update public.product_variants
    set stock = greatest(new.quantity, 0), updated_at = now()
    where id = new.product_variant_id;
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_variant_stock_sync on public.inventory_items;
create trigger inventory_variant_stock_sync
  after insert or update of quantity on public.inventory_items
  for each row execute function public.sync_product_variant_stock();

-- Backfill one variant for every existing published product/inventory pair.
insert into public.product_variants(product_id, inventory_id, label, selling_price, discount_price, stock)
select p.id, i.id, coalesce(nullif(trim(i.unit), ''), 'unit'), coalesce(p.selling_price, 0), p.discount_price, greatest(i.quantity, 0)
from public.products p
join public.inventory_items i on i.id = p.inventory_id
where not exists (
  select 1 from public.product_variants pv
  where pv.product_id = p.id and pv.inventory_id = i.id
);

update public.inventory_items i
set product_variant_id = pv.id
from public.product_variants pv
where pv.inventory_id = i.id and i.product_variant_id is null;

update public.products p
set stock = (select coalesce(sum(pv.stock), 0) from public.product_variants pv where pv.product_id = p.id)
where exists (select 1 from public.product_variants pv where pv.product_id = p.id);

create or replace function public.upsert_product_variant(
  _inventory_id uuid,
  _product_id uuid default null,
  _label text default null,
  _selling_price numeric default 0,
  _discount_price numeric default null
)
returns uuid language plpgsql set search_path = public as $$
declare
  v_variant_id uuid;
  v_inventory public.inventory_items%rowtype;
  v_label text;
begin
  if not (select private.is_staff()) then raise exception 'Not authorized'; end if;
  select * into v_inventory from public.inventory_items where id = _inventory_id for update;
  if v_inventory.id is null then raise exception 'Inventory item not found'; end if;
  v_label := coalesce(nullif(trim(_label), ''), nullif(trim(v_inventory.unit), ''), 'unit');

  select id into v_variant_id
  from public.product_variants
  where inventory_id = _inventory_id
  limit 1 for update;

  if v_variant_id is null then
    insert into public.product_variants(product_id, inventory_id, label, selling_price, discount_price, stock)
    values (_product_id, _inventory_id, v_label, greatest(coalesce(_selling_price, 0), 0), _discount_price, greatest(v_inventory.quantity, 0))
    returning id into v_variant_id;
  else
    update public.product_variants
    set product_id = coalesce(_product_id, product_id),
        label = v_label,
        selling_price = greatest(coalesce(_selling_price, selling_price), 0),
        discount_price = _discount_price,
        stock = greatest(v_inventory.quantity, 0),
        updated_at = now()
    where id = v_variant_id;
  end if;

  update public.inventory_items set product_variant_id = v_variant_id where id = _inventory_id;
  return v_variant_id;
end;
$$;

-- Keep the sale RPC variant-aware. Inventory remains the stock authority for inventory-backed variants.
create or replace function public.create_khata_sale(
  _customer_id uuid,
  _items jsonb,
  _paid numeric default 0,
  _method text default 'cash',
  _entry_date date default current_date,
  _remarks text default null
)
returns uuid language plpgsql set search_path = public as $$
declare
  v_item jsonb; v_product_id uuid; v_inventory_id uuid; v_variant_id uuid;
  v_product_name text; v_qty numeric; v_rate numeric; v_unit text; v_available numeric;
  v_total numeric := 0; v_item_count int := 0; v_tx_id uuid; v_summary text;
begin
  if not (select private.is_staff()) then raise exception 'Not authorized'; end if;
  if not exists (select 1 from public.customers where id = _customer_id) then raise exception 'Customer not found'; end if;
  if _items is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then raise exception 'At least one item is required'; end if;
  if _paid is null or _paid < 0 then raise exception 'Paid amount cannot be negative'; end if;

  for v_item in select * from jsonb_array_elements(_items) loop
    v_qty := coalesce(nullif(v_item->>'quantity', '')::numeric, 0);
    v_rate := coalesce(nullif(v_item->>'rate', '')::numeric, 0);
    v_product_name := coalesce(nullif(v_item->>'product', ''), 'Item');
    if v_qty <= 0 then raise exception 'Quantity must be greater than zero for %', v_product_name; end if;
    if v_rate < 0 then raise exception 'Selling price cannot be negative for %', v_product_name; end if;

    v_variant_id := nullif(v_item->>'product_variant_id', '')::uuid;
    v_inventory_id := nullif(v_item->>'inventory_id', '')::uuid;
    v_product_id := nullif(v_item->>'product_id', '')::uuid;

    if v_variant_id is not null then
      select pv.product_id, pv.inventory_id, pv.stock, pv.label
      into v_product_id, v_inventory_id, v_available, v_unit
      from public.product_variants pv where pv.id = v_variant_id for update;
      if v_available is null then raise exception 'Product variant not found for %', v_product_name; end if;
      if v_available < v_qty then raise exception 'Insufficient stock for %: available %, requested %', v_product_name, v_available, v_qty; end if;
    elsif v_inventory_id is null and v_product_id is not null then
      select p.inventory_id into v_inventory_id from public.products p where p.id = v_product_id;
    end if;

    if v_inventory_id is not null then
      select quantity into v_available from public.inventory_items where id = v_inventory_id for update;
      if v_available is null then raise exception 'Inventory item not found for %', v_product_name; end if;
      if v_available < v_qty then raise exception 'Insufficient stock for %: available %, requested %', v_product_name, v_available, v_qty; end if;
    elsif v_product_id is not null then
      select stock into v_available from public.products where id = v_product_id for update;
      if v_available is null then raise exception 'Product not found for %', v_product_name; end if;
      if v_available < v_qty then raise exception 'Insufficient stock for %: available %, requested %', v_product_name, v_available, v_qty; end if;
    end if;
    v_total := v_total + v_qty * v_rate; v_item_count := v_item_count + 1;
  end loop;

  if _paid > v_total then raise exception 'Paid amount (%) cannot exceed sale total (%)', _paid, v_total; end if;
  select coalesce(nullif(x->>'product', ''), 'Item') into v_summary from jsonb_array_elements(_items) x limit 1;
  if v_item_count > 1 then v_summary := v_summary || ' + ' || (v_item_count - 1) || ' more'; end if;

  insert into public.customer_transactions(customer_id, entry_date, entry_type, product, quantity, amount, payment, method, remarks)
  values (_customer_id, coalesce(_entry_date, current_date), 'purchase', v_summary, v_item_count, v_total, _paid, coalesce(_method, 'cash'), _remarks)
  returning id into v_tx_id;

  for v_item in select * from jsonb_array_elements(_items) loop
    v_qty := (v_item->>'quantity')::numeric;
    v_rate := (v_item->>'rate')::numeric;
    v_unit := coalesce(nullif(v_item->>'unit', ''), 'unit');
    v_product_name := coalesce(nullif(v_item->>'product', ''), 'Item');
    v_variant_id := nullif(v_item->>'product_variant_id', '')::uuid;
    v_inventory_id := nullif(v_item->>'inventory_id', '')::uuid;
    v_product_id := nullif(v_item->>'product_id', '')::uuid;

    if v_variant_id is not null then
      select product_id, inventory_id, label into v_product_id, v_inventory_id, v_unit
      from public.product_variants where id = v_variant_id;
    end if;
    if v_inventory_id is null and v_product_id is not null then
      select p.inventory_id into v_inventory_id from public.products p where p.id = v_product_id;
    end if;

    insert into public.customer_transaction_items(transaction_id, product_id, product_variant_id, product, quantity, unit, rate)
    values (v_tx_id, v_product_id, v_variant_id, v_product_name, v_qty, v_unit, v_rate);

    if v_inventory_id is not null then
      update public.inventory_items
      set quantity = quantity - v_qty,
          last_updated = current_date,
          status = case when quantity - v_qty <= 0 then 'out-of-stock' else status end
      where id = v_inventory_id;
    elsif v_product_id is not null then
      update public.products set stock = stock - v_qty where id = v_product_id;
    end if;
  end loop;

  update public.products p
  set stock = (select coalesce(sum(pv.stock), 0) from public.product_variants pv where pv.product_id = p.id)
  where exists (
    select 1 from public.product_variants pv
    where pv.product_id = p.id
      and pv.id in (select nullif(x->>'product_variant_id', '')::uuid from jsonb_array_elements(_items) x where nullif(x->>'product_variant_id', '') is not null)
  );

  return v_tx_id;
end;
$$;
