-- Store the quantity contained in one product/package for inventory lots.
-- Nullable so existing inventory rows remain valid and preserve their historical meaning.

alter table public.inventory_items
  add column if not exists quantity_per_product numeric;

alter table public.inventory_items
  drop constraint if exists inventory_items_quantity_per_product_check;

alter table public.inventory_items
  add constraint inventory_items_quantity_per_product_check
  check (
    quantity_per_product is null
    or (
      quantity_per_product > 0
      and quantity_per_product <> 'NaN'::numeric
    )
  );

comment on column public.inventory_items.quantity_per_product is
  'Quantity contained in one product/package for this inventory variant; nullable for legacy inventory rows.';

-- Keep the existing purchase RPC unchanged and expose a new, explicit signature
-- so callers can persist quantity_per_product without changing the existing RPC.
create or replace function public.record_inventory_lot_purchase(
  _supplier_id uuid,
  _product_name text,
  _quantity numeric,
  _unit text,
  _purchase_price_per_unit numeric,
  _reference_selling_price_per_unit numeric,
  _allow_loose_sale boolean,
  _min_stock_level numeric,
  _entry_date date,
  _advance_paid numeric,
  _advance_method text,
  _quantity_per_product numeric
)
returns uuid
language plpgsql
security definer
set search_path to public
as $function$
declare
  v_inventory_id uuid;
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  if _quantity_per_product is not null
     and (
       _quantity_per_product <= 0
       or _quantity_per_product = 'NaN'::numeric
     ) then
    raise exception 'Quantity per product must be greater than zero';
  end if;

  v_inventory_id := public.record_inventory_lot_purchase(
    _supplier_id,
    _product_name,
    _quantity,
    _unit,
    _purchase_price_per_unit,
    _reference_selling_price_per_unit,
    _allow_loose_sale,
    _min_stock_level,
    _entry_date,
    _advance_paid,
    _advance_method
  );

  update public.inventory_items
  set quantity_per_product = case
    when _quantity_per_product is null then null
    else round(_quantity_per_product, 6)
  end,
      updated_at = now()
  where id = v_inventory_id;

  return v_inventory_id;
end;
$function$;

revoke execute on function public.record_inventory_lot_purchase(
  uuid,text,numeric,text,numeric,numeric,boolean,numeric,date,numeric,text,numeric
) from public, anon;

grant execute on function public.record_inventory_lot_purchase(
  uuid,text,numeric,text,numeric,numeric,boolean,numeric,date,numeric,text,numeric
) to authenticated;
