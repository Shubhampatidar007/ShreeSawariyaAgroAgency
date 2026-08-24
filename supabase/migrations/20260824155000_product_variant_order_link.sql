create or replace function public.resolve_order_item_variant()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.product_variant_id is null and new.product_id is not null then
    select pv.id into new.product_variant_id
    from public.product_variants pv
    where pv.product_id = new.product_id
      and lower(trim(pv.label)) = lower(trim(coalesce(new.unit,'')))
      and pv.status = 'active'
    order by pv.created_at
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists resolve_order_item_variant on public.order_items;
create trigger resolve_order_item_variant
before insert or update on public.order_items
for each row execute function public.resolve_order_item_variant();
