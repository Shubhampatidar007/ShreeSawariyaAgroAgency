create or replace function public.get_admin_overview_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'staff')
  ) then
    raise exception 'Not authorized';
  end if;

  with inventory_costs as (
    select distinct on (lower(trim(ii.product_name)))
      lower(trim(ii.product_name)) as product_key,
      coalesce(ii.purchase_price, 0)::numeric as purchase_price
    from public.inventory_items ii
    where ii.product_name is not null
    order by lower(trim(ii.product_name)), ii.id desc
  ),
  order_daily as (
    select
      (o.placed_on at time zone 'UTC')::date as day,
      coalesce(o.total, 0)::numeric as sales,
      coalesce(o.paid, 0)::numeric as collected,
      1::bigint as bill_count
    from public.orders o
    where (o.placed_on at time zone 'UTC')::date between current_date - 364 and current_date
  ),
  order_cost_daily as (
    select
      (o.placed_on at time zone 'UTC')::date as day,
      coalesce(sum(coalesce(oi.quantity, 0) * coalesce(ic.purchase_price, 0)), 0)::numeric as cost
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    left join inventory_costs ic on ic.product_key = lower(trim(oi.product))
    where (o.placed_on at time zone 'UTC')::date between current_date - 364 and current_date
    group by (o.placed_on at time zone 'UTC')::date
  ),
  khata_daily as (
    select
      ct.entry_date::date as day,
      coalesce(ct.amount, 0)::numeric as sales,
      coalesce(ct.payment, 0)::numeric as collected,
      1::bigint as bill_count,
      coalesce(ct.quantity, 0)::numeric * coalesce(ic.purchase_price, 0)::numeric as cost
    from public.customer_transactions ct
    left join inventory_costs ic on ic.product_key = lower(trim(ct.product))
    where ct.entry_type = 'sale'
      and ct.entry_date::date between current_date - 364 and current_date
  ),
  purchase_daily as (
    select
      st.entry_date::date as day,
      coalesce(sum(st.amount), 0)::numeric as purchases
    from public.supplier_transactions st
    where st.entry_type = 'purchase'
      and st.entry_date::date between current_date - 364 and current_date
    group by st.entry_date::date
  ),
  daily_rows as (
    select
      gs::date as date,
      coalesce((select sum(od.sales) from order_daily od where od.day = gs::date), 0)
        + coalesce((select sum(kd.sales) from khata_daily kd where kd.day = gs::date), 0) as sales,
      coalesce((select sum(pd.purchases) from purchase_daily pd where pd.day = gs::date), 0) as purchases,
      coalesce((select sum(oc.cost) from order_cost_daily oc where oc.day = gs::date), 0)
        + coalesce((select sum(kd.cost) from khata_daily kd where kd.day = gs::date), 0) as cost,
      coalesce((select sum(od.collected) from order_daily od where od.day = gs::date), 0)
        + coalesce((select sum(kd.collected) from khata_daily kd where kd.day = gs::date), 0) as collected,
      coalesce((select sum(od.bill_count) from order_daily od where od.day = gs::date), 0)
        + coalesce((select sum(kd.bill_count) from khata_daily kd where kd.day = gs::date), 0) as bill_count
    from generate_series(current_date - 364, current_date, interval '1 day') gs
  ),
  order_item_sales as (
    select
      nullif(trim(oi.product), '') as product_name,
      coalesce(oi.quantity, 0)::numeric as quantity,
      coalesce(oi.amount, 0)::numeric as item_amount,
      greatest(coalesce(o.subtotal, 0) - coalesce(o.discount, 0), 0)::numeric as net_subtotal,
      coalesce(ic.purchase_price, 0)::numeric as purchase_price,
      sum(coalesce(oi.amount, 0)) over (partition by oi.order_id)::numeric as order_item_subtotal
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    left join inventory_costs ic on ic.product_key = lower(trim(oi.product))
  ),
  product_sales as (
    select
      coalesce(product_name, 'Unknown product') as name,
      sum(quantity) as quantity,
      sum(case when order_item_subtotal > 0 then (item_amount / order_item_subtotal) * net_subtotal else item_amount end) as revenue,
      sum(quantity * purchase_price) as cost
    from order_item_sales
    group by coalesce(product_name, 'Unknown product')
    union all
    select
      coalesce(nullif(trim(ct.product), ''), 'Unknown product') as name,
      sum(coalesce(ct.quantity, 0)) as quantity,
      sum(coalesce(ct.amount, 0)) as revenue,
      sum(coalesce(ct.quantity, 0) * coalesce(ic.purchase_price, 0)) as cost
    from public.customer_transactions ct
    left join inventory_costs ic on ic.product_key = lower(trim(ct.product))
    where ct.entry_type = 'sale'
    group by coalesce(nullif(trim(ct.product), ''), 'Unknown product')
  ),
  product_profit as (
    select
      name,
      sum(quantity) as quantity,
      sum(revenue) as revenue,
      sum(cost) as cost,
      sum(revenue - cost) as profit
    from product_sales
    group by name
    having sum(revenue) <> 0 or sum(cost) <> 0
  ),
  today as (
    select
      coalesce((select sales from daily_rows where date = current_date), 0) as sales,
      coalesce((select collected from daily_rows where date = current_date), 0) as collected,
      coalesce((select bill_count from daily_rows where date = current_date), 0) as bill_count,
      coalesce((select cost from daily_rows where date = current_date), 0) as cost,
      (select count(*) from public.payments p where p.entry_date = current_date) as payments_count,
      (select coalesce(sum(ii.quantity * ii.purchase_price), 0) from public.inventory_items ii) as stock_value,
      (select count(*) from public.inventory_items) as stock_count,
      (select coalesce(sum(ii.quantity), 0) from public.inventory_items ii) as stock_units,
      (select count(*) from public.inventory_items ii where ii.quantity <= ii.min_stock_level) as low_stock_count,
      (select count(*) from public.customers c where c.status = 'active') as active_customers,
      (select count(*) from public.customers) as customer_count,
      (select coalesce(sum(c.current_due), 0) from public.customers c) as customer_due,
      (select count(*) from public.customers c where coalesce(c.current_due, 0) > 0) as customers_with_due
  ),
  daily_json as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'date', dr.date,
        'sales', dr.sales,
        'purchases', dr.purchases,
        'cost', dr.cost,
        'profit', dr.sales - dr.cost,
        'margin', case when dr.sales = 0 then 0 else ((dr.sales - dr.cost) / dr.sales) * 100 end
      ) order by dr.date
    ), '[]'::jsonb) as rows
    from daily_rows dr
  ),
  product_json as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'name', pp.name,
        'quantity', pp.quantity,
        'revenue', pp.revenue,
        'cost', pp.cost,
        'profit', pp.profit
      ) order by pp.profit desc
    ), '[]'::jsonb) as rows
    from product_profit pp
  )
  select jsonb_build_object(
    'dailyRows', daily_json.rows,
    'productProfit', product_json.rows,
    'today', jsonb_build_object(
      'sales', today.sales,
      'collected', today.collected,
      'billCount', today.bill_count,
      'cost', today.cost,
      'profit', today.sales - today.cost,
      'paymentsCount', today.payments_count,
      'stockValue', today.stock_value,
      'stockCount', today.stock_count,
      'stockUnits', today.stock_units,
      'lowStockCount', today.low_stock_count,
      'activeCustomers', today.active_customers,
      'customerCount', today.customer_count,
      'customerDue', today.customer_due,
      'customersWithDue', today.customers_with_due
    )
  ) into result
  from daily_json, product_json, today;

  return result;
end;
$$;

grant execute on function public.get_admin_overview_metrics() to authenticated;