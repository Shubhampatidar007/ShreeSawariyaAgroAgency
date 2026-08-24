-- Keep the existing inventory purchase RPC compatible while creating/reusing a parent product
-- and a variant for every inventory pack size.
create or replace function public.record_supplier_purchase(_supplier_id uuid, _product_name text, _quantity numeric, _unit text, _purchase_price numeric, _min_stock_level numeric default 0, _entry_date date default current_date, _advance_paid numeric default 0, _advance_method text default 'cash')
returns uuid language plpgsql set search_path = public as $$
declare
  v_inventory_id uuid; v_supplier_name text; v_total numeric; v_advance numeric; v_new_due numeric; v_existing_quantity numeric;
  v_product_id uuid; v_variant_id uuid; v_label text;
begin
  if not (select private.is_staff()) then raise exception 'Not authorized'; end if;
  if _quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;
  if _purchase_price < 0 then raise exception 'Purchase price cannot be negative'; end if;
  if coalesce(trim(_product_name), '') = '' then raise exception 'Product name is required'; end if;
  if coalesce(trim(_unit), '') = '' then raise exception 'Unit is required'; end if;
  v_advance := greatest(coalesce(_advance_paid, 0), 0);

  select company into v_supplier_name from public.suppliers where id = _supplier_id for update;
  if v_supplier_name is null then raise exception 'Supplier not found'; end if;
  v_total := _quantity * _purchase_price;
  if v_advance > v_total then raise exception 'Advance paid cannot exceed purchase total'; end if;
  if coalesce(_advance_method, 'cash') not in ('cash','upi','bank','cheque') then raise exception 'Invalid advance payment method'; end if;

  select id, quantity into v_inventory_id, v_existing_quantity
  from public.inventory_items
  where supplier_id = _supplier_id
    and lower(trim(product_name)) = lower(trim(_product_name))
    and lower(trim(unit)) = lower(trim(_unit))
    and purchase_price = _purchase_price
  order by last_updated desc
  limit 1 for update;

  if v_inventory_id is not null then
    update public.inventory_items
    set quantity = quantity + _quantity,
        min_stock_level = coalesce(_min_stock_level, min_stock_level, 0),
        status = case when quantity + _quantity <= 0 then 'out-of-stock' else 'in-stock' end,
        last_updated = coalesce(_entry_date, current_date)
    where id = v_inventory_id;
  else
    insert into public.inventory_items(product_name,supplier_id,supplier_name,quantity,unit,purchase_price,min_stock_level,status,last_updated)
    values(_product_name,_supplier_id,v_supplier_name,_quantity,_unit,_purchase_price,coalesce(_min_stock_level,0),case when _quantity <= 0 then 'out-of-stock' else 'in-stock' end,coalesce(_entry_date,current_date))
    returning id into v_inventory_id;
  end if;

  select id into v_product_id
  from public.products
  where lower(trim(title)) = lower(trim(_product_name))
    and status <> 'archived'
  order by case when status = 'published' then 0 else 1 end, created_at
  limit 1 for update;

  if v_product_id is null then
    insert into public.products(inventory_id,title,category,selling_price,discount_price,stock,description,tags,images,emoji,visibility,featured,status,published_on)
    values(v_inventory_id,_product_name,'Fertilizers',_purchase_price,null,_quantity,'',array[]::text[],array[]::text[],'🌾','hidden',false,'draft',current_date)
    returning id into v_product_id;
  end if;

  v_label := coalesce(nullif(trim(_unit),''),'unit');
  select id into v_variant_id from public.product_variants where inventory_id = v_inventory_id limit 1 for update;
  if v_variant_id is null then
    insert into public.product_variants(product_id,inventory_id,label,selling_price,stock)
    values(v_product_id,v_inventory_id,v_label,_purchase_price,greatest(_quantity,0))
    returning id into v_variant_id;
  else
    update public.product_variants
    set product_id=v_product_id,label=v_label,stock=(select quantity from public.inventory_items where id=v_inventory_id),updated_at=now()
    where id=v_variant_id;
  end if;
  update public.inventory_items set product_variant_id=v_variant_id where id=v_inventory_id;
  update public.products set stock=(select coalesce(sum(pv.stock),0) from public.product_variants pv where pv.product_id=v_product_id) where id=v_product_id;

  update public.suppliers
  set total_purchases=coalesce(total_purchases,0)+v_total,
      total_paid=coalesce(total_paid,0)+v_advance,
      due_balance=coalesce(due_balance,0)+v_total-v_advance,
      last_order=coalesce(_entry_date,current_date), updated_at=now()
  where id=_supplier_id
  returning due_balance into v_new_due;

  insert into public.supplier_transactions(supplier_id,entry_date,entry_type,reference,amount,balance,method,remarks,inventory_item_id,product_name,quantity,unit,rate)
  values(_supplier_id,coalesce(_entry_date,current_date),'purchase',_product_name,v_total,v_new_due,'credit',case when v_existing_quantity is not null then 'Additional stock added to existing inventory' else null end,v_inventory_id,_product_name,_quantity,_unit,_purchase_price);

  if v_advance > 0 then
    insert into public.supplier_transactions(supplier_id,entry_date,entry_type,reference,amount,balance,method,remarks,inventory_item_id,product_name,quantity,unit,rate)
    values(_supplier_id,coalesce(_entry_date,current_date),'advance','ADV-'||left(v_inventory_id::text,8),v_advance,v_new_due,coalesce(_advance_method,'cash'),'Advance paid against inventory purchase',v_inventory_id,_product_name,_quantity,_unit,_purchase_price);
  end if;

  return v_inventory_id;
end;
$$;

-- The current publish screen still calls products.insert(). If an inventory item already
-- owns a draft parent product, merge the publish payload into that parent instead of creating
-- a duplicate product row.
create or replace function public.merge_product_publish_insert()
returns trigger language plpgsql set search_path = public as $$
declare v_existing_id uuid;
begin
  if new.inventory_id is null then return new; end if;
  select id into v_existing_id from public.products where inventory_id = new.inventory_id limit 1 for update;
  if v_existing_id is null then return new; end if;
  update public.products set
    title=new.title, category=new.category, selling_price=new.selling_price,
    discount_price=new.discount_price, stock=new.stock, description=new.description,
    tags=new.tags, images=new.images, emoji=new.emoji, visibility=new.visibility,
    featured=new.featured, status=new.status, published_on=new.published_on, updated_at=now()
  where id=v_existing_id;
  update public.inventory_items set status='published' where id=new.inventory_id;
  return null;
end;
$$;

drop trigger if exists merge_product_publish_insert on public.products;
create trigger merge_product_publish_insert before insert on public.products
for each row execute function public.merge_product_publish_insert();
