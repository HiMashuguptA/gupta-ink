-- Percentage coupons round down to whole rupees, so UPI amounts never carry paise
create or replace function public._price_order(p_user uuid, p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  s public.settings;
  w public.wallets;
  typ text := coalesce(p->>'type', 'quick');
  it jsonb; pr record; q int;
  items jsonb := '[]'; errors text[] := '{}';
  total int := 0; mrp_total int := 0;
  c public.coupons; coupon jsonb := null; disc int := 0; free_del boolean := false; eligible int := 0; uses int;
  after_c int; fee int := 0; fine int := 0;
  coins_avail int := 0; coins_max int := 0; coins_used int := 0;
  payable int; earn int;
  n timestamp := public._ist_now();
  holiday boolean; quick_ok boolean; quick_reason text;
  slot record; addr public.addresses; addr_json jsonb := null;
  upi_today int; methods jsonb;
begin
  select * into s from public.settings where id = 1;
  select * into w from public.wallets where user_id = p_user;

  -- Items: always re-priced from the database
  for it in select * from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb)) loop
    q := greatest(coalesce((it->>'qty')::int, 0), 0);
    if q < 1 then continue; end if;
    select pp.id, pp.price_paise, pp.mrp_paise, pp.stock, pp.max_per_order, pp.active, pp.variant_label,
           pp.images, pp.gst_rate, pp.hsn, g.name, g.returnable, g.category_id, ct.active as cat_active
      into pr
      from public.products pp
      join public.product_groups g on g.id = pp.group_id
      join public.categories ct on ct.id = g.category_id
     where pp.id = (it->>'product_id')::uuid;
    if not found or not pr.active or not pr.cat_active then
      errors := array_append(errors, 'An item in your cart is no longer available. Remove it to continue.'::text);
      continue;
    end if;
    if q > least(pr.stock, pr.max_per_order) then
      errors := array_append(errors, format('Only %s of %s can be ordered right now', least(pr.stock, pr.max_per_order), pr.name)::text);
    end if;
    total := total + pr.price_paise * q;
    mrp_total := mrp_total + pr.mrp_paise * q;
    items := items || jsonb_build_object(
      'product_id', pr.id, 'name', pr.name, 'variant_label', pr.variant_label, 'image', pr.images[1],
      'price_paise', pr.price_paise, 'mrp_paise', pr.mrp_paise, 'qty', q, 'gst_rate', pr.gst_rate,
      'hsn', pr.hsn, 'returnable', pr.returnable, 'category_id', pr.category_id);
  end loop;
  if jsonb_array_length(items) = 0 then errors := array_append(errors, 'Your cart is empty'::text); end if;

  -- Coupon
  if coalesce(trim(p->>'coupon_code'), '') <> '' then
    select * into c from public.coupons where code = upper(trim(p->>'coupon_code'));
    if not found or not c.active or c.valid_from > now() or (c.valid_to is not null and c.valid_to <= now())
       or (c.audience = 'selected' and not (p_user = any(c.audience_user_ids))) then
      coupon := jsonb_build_object('code', upper(trim(p->>'coupon_code')), 'error', 'This coupon isn''t valid');
    else
      select count(*) into uses from public.coupon_uses where code = c.code and user_id = p_user and not reverted;
      eligible := case when cardinality(c.category_ids) = 0 then total else
        (select coalesce(sum((x->>'price_paise')::int * (x->>'qty')::int), 0) from jsonb_array_elements(items) x
          where (x->>'category_id')::uuid = any(c.category_ids)) end;
      if uses >= c.per_user_limit then
        coupon := jsonb_build_object('code', c.code, 'error', 'You''ve already used this coupon');
      elsif c.total_limit is not null and c.used_count >= c.total_limit then
        coupon := jsonb_build_object('code', c.code, 'error', 'This coupon has run out');
      elsif c.first_order_only and exists (select 1 from public.orders o where o.user_id = p_user and o.status <> 'cancelled') then
        coupon := jsonb_build_object('code', c.code, 'error', 'This coupon is for your first order only');
      elsif total < c.min_order_paise then
        coupon := jsonb_build_object('code', c.code, 'error', format('Add %s more to use this coupon', public._inr(c.min_order_paise - total)));
      elsif eligible = 0 then
        coupon := jsonb_build_object('code', c.code, 'error', 'This coupon doesn''t apply to these items');
      else
        disc := case c.type
          when 'percent' then least((floor(eligible * c.value / 10000.0) * 100)::int, coalesce(c.max_discount_paise, 2147483647))
          when 'flat' then least(c.value, eligible)
          else 0 end;
        free_del := c.type = 'free_delivery';
        coupon := jsonb_build_object('code', c.code, 'title', c.title, 'discount_paise', disc, 'free_delivery', free_del);
      end if;
    end if;
  end if;

  after_c := total - disc;
  if jsonb_array_length(items) > 0 and after_c < s.min_order_paise then
    errors := array_append(errors, format('Minimum order is %s. Add %s more.', public._inr(s.min_order_paise), public._inr(s.min_order_paise - after_c))::text);
  end if;

  -- Fulfilment availability
  holiday := n::date = any(s.holidays);
  quick_ok := not s.orders_paused and not holiday and n::time >= s.delivery_start and n::time <= s.quick_last_order;
  quick_reason := case
    when s.orders_paused then 'We''re not taking orders right now'
    when holiday then 'The store is closed today'
    when not quick_ok then format('Quick delivery runs %s to %s. Schedule a slot or pick up instead.', to_char(s.delivery_start, 'HH24:MI'), to_char(s.quick_last_order, 'HH24:MI'))
    end;
  if s.orders_paused then errors := array_append(errors, 'We''re not taking orders right now'::text); end if;
  if typ = 'quick' and not quick_ok and not s.orders_paused then errors := array_append(errors, quick_reason::text); end if;

  if typ = 'scheduled' then
    select * into slot from public.checkout_slots() cs
     where cs.slot_date = (p->>'slot_date')::date and cs.window_start = (p->>'slot_start')::time;
    if not found then errors := array_append(errors, 'Choose a delivery slot'::text);
    elsif not slot.open then errors := array_append(errors, format('That slot isn''t available (%s). Pick another.', lower(slot.reason))::text);
    end if;
  end if;

  -- Address and distance (delivery only)
  if typ <> 'pickup' then
    select * into addr from public.addresses a where a.id = nullif(p->>'address_id', '')::uuid and a.user_id = p_user;
    if not found then
      errors := array_append(errors, 'Choose a delivery address'::text);
    else
      addr_json := jsonb_build_object('id', addr.id, 'road_km', addr.road_km, 'in_range', addr.road_km is not null and addr.road_km <= s.delivery_radius_km);
      if addr.road_km is null then errors := array_append(errors, 'Confirm your delivery location on the map'::text);
      elsif addr.road_km > s.delivery_radius_km then
        errors := array_append(errors, format('This address is %s km away by road. We deliver within %s km; store pickup is available.', round(addr.road_km, 1), s.delivery_radius_km)::text);
      end if;
    end if;
  end if;

  -- Fees, fine, coins
  fee := case when typ = 'pickup' or free_del or after_c >= s.free_delivery_min_paise then 0 else s.delivery_fee_paise end;
  fine := coalesce(w.pending_fine_paise, 0);
  select coalesce(sum(remaining), 0) into coins_avail from public.coin_ledger
   where user_id = p_user and remaining > 0 and (expires_at is null or expires_at > now());
  -- Coins can't bring the item total below ₹1 and never pay the delivery fee or fine
  coins_max := greatest(0, least(coins_avail, (after_c - 100) / 100));
  coins_used := case when coalesce((p->>'use_coins')::boolean, false) then coins_max else 0 end;
  payable := after_c - coins_used * 100 + fee + fine;
  earn := floor((after_c - coins_used * 100) * s.coin_rate_bp / 10000.0 / 100)::int;

  -- Payment methods
  select count(*) into upi_today from public.payments
   where method = 'upi' and status in ('pending', 'success') and (created_at at time zone 'Asia/Kolkata')::date = n::date;
  methods := jsonb_build_object(
    'upi', upi_today < s.upi_daily_cap,
    'cod', typ <> 'pickup' and payable <= s.cod_limit_paise,
    'counter', typ = 'pickup');

  return jsonb_build_object(
    'items', items,
    'items_total_paise', total,
    'mrp_total_paise', mrp_total,
    'coupon', coupon,
    'coupon_discount_paise', disc,
    'after_coupon_paise', after_c,
    'delivery_fee_paise', fee,
    'free_delivery_min_paise', s.free_delivery_min_paise,
    'fine_paise', fine,
    'coins', jsonb_build_object('available', coins_avail, 'max', coins_max, 'used', coins_used),
    'payable_paise', payable,
    'coins_to_earn', earn,
    'address', addr_json,
    'availability', jsonb_build_object('quick', quick_ok, 'quick_reason', quick_reason, 'pickup', not s.orders_paused,
      'eta', format('%s-%s min', s.quick_eta_min, s.quick_eta_max)),
    'methods', methods,
    'cod_limit_paise', s.cod_limit_paise,
    'errors', to_jsonb(errors));
end $$;
revoke execute on function public._price_order(uuid, jsonb) from anon, authenticated, public;
