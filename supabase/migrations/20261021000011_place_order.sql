-- Phase 2: atomic order placement

create or replace function public.place_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  s public.settings;
  q jsonb; o public.orders; addr public.addresses;
  typ public.order_type; pm public.payment_method;
  key text := nullif(p->>'idempotency_key', '');
  it jsonb; need int; take int; cr record; alloc jsonb := '[]';
  coins_used int; fine int; disc int; slot_end time;
  first_status public.order_status;
begin
  perform public.require_active();

  -- A double tap or network retry returns the order already placed
  if key is not null then
    select * into o from public.orders where idempotency_key = key and user_id = uid;
    if found then
      return jsonb_build_object('order_id', o.id, 'order_no', o.order_no, 'payable_paise', o.payable_paise,
        'payment_method', o.payment_method, 'status', o.status, 'duplicate', true);
    end if;
  end if;
  perform public.hit_rate_limit('place_order', 10, 3600);

  select * into s from public.settings where id = 1;
  begin
    typ := (p->>'type')::public.order_type;
    pm := (p->>'payment_method')::public.payment_method;
  exception when others then
    raise exception 'Choose how you want to get your order and how you''ll pay';
  end;

  -- Lock the products and wallet so two orders can't oversell or double-spend coins
  perform 1 from public.products
   where id in (select (x->>'product_id')::uuid from jsonb_array_elements(p->'items') x)
   order by id for update;
  perform 1 from public.wallets where user_id = uid for update;

  q := public._price_order(uid, p);
  if jsonb_array_length(q->'errors') > 0 then
    raise exception '%', q->'errors'->>0;
  end if;
  if not coalesce((q->'methods'->>(pm::text))::boolean, false) then
    raise exception 'That payment option isn''t available for this order';
  end if;
  if q->'coupon' ? 'error' then
    raise exception '%', q->'coupon'->>'error';
  end if;

  if typ <> 'pickup' then
    select * into addr from public.addresses where id = (p->>'address_id')::uuid and user_id = uid;
    if not public._distance_sig_ok(addr) then
      raise exception 'Please confirm your delivery location on the map again';
    end if;
  end if;

  -- Reserve the delivery slot
  if typ = 'scheduled' then
    select cs.window_end into slot_end from public.checkout_slots() cs
     where cs.slot_date = (p->>'slot_date')::date and cs.window_start = (p->>'slot_start')::time;
    insert into public.slot_bookings (slot_date, window_start, window_end, booked)
    values ((p->>'slot_date')::date, (p->>'slot_start')::time, slot_end, 0)
    on conflict (slot_date, window_start) do nothing;
    update public.slot_bookings set booked = booked + 1
     where slot_date = (p->>'slot_date')::date and window_start = (p->>'slot_start')::time and booked < s.slot_capacity;
    if not found then raise exception 'That slot just filled up. Please pick another.'; end if;
  end if;

  disc := (q->>'coupon_discount_paise')::int;
  coins_used := (q->'coins'->>'used')::int;
  fine := (q->>'fine_paise')::int;

  -- Coupon usage (locked count so a limited coupon can't be over-used)
  if q->'coupon' is not null and jsonb_typeof(q->'coupon') = 'object' then
    update public.coupons set used_count = used_count + 1
     where code = q->'coupon'->>'code' and (total_limit is null or used_count < total_limit);
    if not found then raise exception 'This coupon has run out'; end if;
  end if;

  first_status := case when pm = 'upi' then 'placed' else 'confirmed' end;

  insert into public.orders (
    user_id, type, slot_date, slot_start, slot_end, address, road_km,
    items_total_paise, coupon_code, coupon_discount_paise, coins_used, delivery_fee_paise, fine_paise,
    payable_paise, coins_to_earn, payment_method, payment_status, status, note, idempotency_key, confirmed_at)
  values (
    uid, typ,
    case when typ = 'scheduled' then (p->>'slot_date')::date end,
    case when typ = 'scheduled' then (p->>'slot_start')::time end,
    case when typ = 'scheduled' then slot_end end,
    case when typ <> 'pickup' then jsonb_build_object(
      'label', addr.label, 'house_name', addr.house_name, 'road', addr.road, 'landmark', addr.landmark,
      'contact_name', addr.contact_name, 'contact_phone', addr.contact_phone, 'for_someone_else', addr.for_someone_else,
      'lat', addr.lat, 'lng', addr.lng) end,
    case when typ <> 'pickup' then addr.road_km end,
    (q->>'items_total_paise')::int, case when disc > 0 or (q->'coupon'->>'free_delivery')::boolean then q->'coupon'->>'code' end,
    disc, coins_used, (q->>'delivery_fee_paise')::int, fine,
    (q->>'payable_paise')::int, (q->>'coins_to_earn')::int, pm, 'pending', first_status,
    left(nullif(trim(p->>'note'), ''), 300), key,
    case when first_status = 'confirmed' then now() end)
  returning * into o;

  -- Items, stock and popularity
  for it in select * from jsonb_array_elements(q->'items') loop
    insert into public.order_items (order_id, product_id, name, variant_label, image_url, mrp_paise, price_paise, qty, gst_rate, hsn, returnable)
    values (o.id, (it->>'product_id')::uuid, it->>'name', it->>'variant_label', it->>'image', (it->>'mrp_paise')::int,
      (it->>'price_paise')::int, (it->>'qty')::int, (it->>'gst_rate')::numeric, it->>'hsn', (it->>'returnable')::boolean);
    update public.products set stock = stock - (it->>'qty')::int where id = (it->>'product_id')::uuid;
    update public.product_groups g set sold_count = sold_count + (it->>'qty')::int
      from public.products pp where pp.id = (it->>'product_id')::uuid and g.id = pp.group_id;
  end loop;

  if o.coupon_code is not null then
    insert into public.coupon_uses (code, user_id, order_id, discount_paise) values (o.coupon_code, uid, o.id, disc);
  end if;

  -- Spend coins, oldest-expiring first
  if coins_used > 0 then
    need := coins_used;
    for cr in select id, remaining from public.coin_ledger
               where user_id = uid and remaining > 0 and (expires_at is null or expires_at > now())
               order by expires_at nulls last, created_at for update loop
      take := least(need, cr.remaining);
      update public.coin_ledger set remaining = remaining - take where id = cr.id;
      alloc := alloc || jsonb_build_object('credit_id', cr.id, 'n', take);
      need := need - take;
      exit when need = 0;
    end loop;
    if need > 0 then raise exception 'Your SuperCoin balance changed. Please review your order.'; end if;
    insert into public.coin_ledger (user_id, entry, amount, remaining, order_id, note, alloc)
    values (uid, 'spend', -coins_used, 0, o.id, 'Used on order ' || o.order_no, alloc);
    update public.wallets set coin_balance = coin_balance - coins_used, updated_at = now() where user_id = uid;
  end if;

  -- A pending cancellation fine is settled on this order
  if fine > 0 then
    update public.wallets set pending_fine_paise = 0, updated_at = now() where user_id = uid;
  end if;

  insert into public.payments (order_id, method, amount_paise, status) values (o.id, pm, o.payable_paise, 'pending');

  insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'placed', uid, null);
  if first_status = 'confirmed' then
    insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'confirmed', null, null);
  end if;

  perform public.notify(uid, 'order', 'Order ' || o.order_no || ' placed',
    case when pm = 'upi' then 'Complete your UPI payment of ' || public._inr(o.payable_paise) || ' to confirm it.'
         else 'We''ve got it. We''ll let you know as it moves along.' end,
    '/orders/' || o.id);
  perform public.notify_admins('new_order', 'New order ' || o.order_no || ': ' || public._inr(o.payable_paise),
    initcap(o.type::text) || ', ' || case pm when 'cod' then 'cash on delivery' when 'counter' then 'pay at counter' else 'UPI (awaiting payment)' end,
    '/admin/orders/' || o.id);

  return jsonb_build_object('order_id', o.id, 'order_no', o.order_no, 'payable_paise', o.payable_paise,
    'payment_method', o.payment_method, 'status', o.status,
    'upi', case when pm = 'upi' then jsonb_build_object('vpa', s.store_upi_id, 'name', s.store_name, 'note', o.order_no) end);
end $$;

revoke execute on function public.place_order(jsonb) from anon, public;
grant execute on function public.place_order(jsonb) to authenticated;
