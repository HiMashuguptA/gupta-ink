-- Phase 5: sales report for the store and a spending summary for each customer

create or replace function public.admin_report(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare d0 timestamptz; d1 timestamptz; p0 timestamptz; span int; res jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Pick a valid date range'; end if;
  if p_to - p_from > 366 then raise exception 'Pick a range of up to one year'; end if;
  d0 := p_from::timestamp at time zone 'Asia/Kolkata';
  d1 := (p_to + 1)::timestamp at time zone 'Asia/Kolkata';
  span := p_to - p_from + 1;
  p0 := d0 - make_interval(days => span);

  with o as (
    select * from public.orders where created_at >= d0 and created_at < d1 and status <> 'cancelled'
  ), prev as (
    select * from public.orders where created_at >= p0 and created_at < d0 and status <> 'cancelled'
  ), lines as (
    select oi.*, g.name as group_name, c.name as category
      from public.order_items oi
      join o on o.id = oi.order_id
      join public.products p on p.id = oi.product_id
      join public.product_groups g on g.id = p.group_id
      join public.categories c on c.id = g.category_id
  )
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'totals', (select jsonb_build_object(
        'revenue', coalesce(sum(payable_paise), 0), 'orders', count(*), 'customers', count(distinct user_id),
        'coupon_cost', coalesce(sum(coupon_discount_paise), 0), 'coin_cost', coalesce(sum(coins_used), 0) * 100,
        'delivery_fees', coalesce(sum(delivery_fee_paise), 0),
        'units', (select coalesce(sum(qty), 0) from lines)) from o),
    'prev', (select jsonb_build_object('revenue', coalesce(sum(payable_paise), 0), 'orders', count(*), 'customers', count(distinct user_id)) from prev),
    'cancelled', (select count(*) from public.orders where created_at >= d0 and created_at < d1 and status = 'cancelled'),
    'refunds', (select coalesce(sum(refund_amount_paise), 0) from public.returns where status = 'refunded' and refunded_at >= d0 and refunded_at < d1)
             + (select coalesce(sum(refund_due_paise), 0) from public.orders where refunded_at >= d0 and refunded_at < d1),
    'new_customers', (select count(*) from (
        select user_id, min(created_at) first_at from public.orders where status <> 'cancelled' group by user_id) f
        where f.first_at >= d0 and f.first_at < d1),
    'daily', (select jsonb_agg(jsonb_build_object('date', d::date, 'revenue', coalesce(x.rev, 0), 'orders', coalesce(x.n, 0)) order by d)
        from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d
        left join (select (created_at at time zone 'Asia/Kolkata')::date as day, sum(payable_paise) rev, count(*) n from o group by 1) x on x.day = d::date),
    'hours', (select jsonb_agg(jsonb_build_object('hour', h, 'orders', coalesce(x.n, 0)) order by h)
        from generate_series(0, 23) h
        left join (select extract(hour from created_at at time zone 'Asia/Kolkata')::int as hr, count(*) n from o group by 1) x on x.hr = h),
    'categories', coalesce((select jsonb_agg(row_to_json(t) order by t.revenue desc) from (
        select category as name, sum(price_paise * (qty - returned_qty))::int as revenue, sum(qty - returned_qty)::int as units
          from lines group by category) t), '[]'),
    'products', coalesce((select jsonb_agg(row_to_json(t) order by t.units desc, t.revenue desc) from (
        select group_name as name, variant_label, sum(qty - returned_qty)::int as units, sum(price_paise * (qty - returned_qty))::int as revenue
          from lines group by group_name, variant_label order by 3 desc, 4 desc limit 10) t), '[]'),
    'customers', coalesce((select jsonb_agg(row_to_json(t) order by t.spend desc) from (
        select pr.name, pr.email, count(*)::int as orders, sum(o.payable_paise)::int as spend, max(o.created_at) as last_order
          from o join public.profiles pr on pr.id = o.user_id group by pr.id, pr.name, pr.email order by 4 desc limit 10) t), '[]'),
    'types', coalesce((select jsonb_agg(row_to_json(t) order by t.orders desc) from (
        select type::text as name, count(*)::int as orders, sum(payable_paise)::int as revenue from o group by type) t), '[]'),
    'payments', coalesce((select jsonb_agg(row_to_json(t) order by t.orders desc) from (
        select payment_method::text as name, count(*)::int as orders, sum(payable_paise)::int as revenue from o group by payment_method) t), '[]')
  ) into res;
  return res;
end $$;

-- A customer's own spending: last 6 months, by category, and what they saved
create or replace function public.my_spending() returns jsonb
language sql stable security definer set search_path = '' as $$
  with o as (
    select * from public.orders where user_id = auth.uid() and status <> 'cancelled'
  ), refunds as (
    select coalesce(sum(refund_amount_paise), 0) n from public.returns where user_id = auth.uid() and status = 'refunded'
  ), lines as (
    select oi.*, c.name as category from public.order_items oi join o on o.id = oi.order_id
      join public.products p on p.id = oi.product_id join public.product_groups g on g.id = p.group_id
      join public.categories c on c.id = g.category_id
  ), months as (
    select generate_series(date_trunc('month', (now() at time zone 'Asia/Kolkata')) - interval '5 months',
                           date_trunc('month', (now() at time zone 'Asia/Kolkata')), interval '1 month')::date as m
  )
  select jsonb_build_object(
    'spent', (select coalesce(sum(payable_paise), 0) from o) - (select n from refunds),
    'orders', (select count(*) from o),
    'saved', (select coalesce(sum((mrp_paise - price_paise) * qty), 0) from lines)
           + (select coalesce(sum(coupon_discount_paise + coins_used * 100), 0) from o),
    'coins_earned', (select coalesce(sum(amount), 0) from public.coin_ledger where user_id = auth.uid() and entry in ('earn', 'referral')),
    'months', (select jsonb_agg(jsonb_build_object('month', m, 'spent', coalesce(x.s, 0), 'orders', coalesce(x.n, 0)) order by m)
        from months left join (select date_trunc('month', created_at at time zone 'Asia/Kolkata')::date mo, sum(payable_paise) s, count(*) n from o group by 1) x on x.mo = m),
    'categories', coalesce((select jsonb_agg(row_to_json(t) order by t.spent desc) from (
        select category as name, sum(price_paise * (qty - returned_qty))::int as spent from lines group by category) t), '[]')
  )
$$;

revoke execute on function public.admin_report(date, date) from anon, public;
grant execute on function public.admin_report(date, date) to authenticated;
revoke execute on function public.my_spending() from anon, public;
grant execute on function public.my_spending() to authenticated;
