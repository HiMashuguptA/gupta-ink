-- Phase 2: cancellation, status changes, agent assignment, payment verification

create or replace function public._status_message(st public.order_status, o public.orders) returns text[]
language sql immutable set search_path = '' as $$
  select case st
    when 'confirmed' then array['Order ' || o.order_no || ' confirmed', 'We''ll start packing it soon.']
    when 'getting_ready' then array['We''re getting your order ready', 'Picking your items off the shelf.']
    when 'packed' then array['Your order is packed', case when o.type = 'pickup' then 'Almost ready for pickup.' else 'A delivery partner will be assigned shortly.' end]
    when 'agent_assigned' then array['Delivery partner assigned', 'They''ll pick up your order from the store soon.']
    when 'agent_accepted' then array['Your delivery partner is on the way', 'You can follow them live on the map.']
    when 'out_for_delivery' then array['Out for delivery', 'Keep your delivery code handy. It''s in your email.']
    when 'delivered' then array['Delivered', 'Enjoy! You can rate your items or request a return within 3 days.']
    when 'ready_for_pickup' then array['Ready for pickup', 'Collect it at Khedi Market, opposite Hotel Galaxy, within 48 hours.']
    when 'collected' then array['Collected', 'Thanks for shopping with Gupta Ink!']
    when 'cancelled' then array['Order ' || o.order_no || ' cancelled', null]
    else array['Order ' || o.order_no || ' updated', null] end
$$;

-- Undo everything an order reserved, then mark it cancelled
create or replace function public._cancel_order(p_order uuid, p_by text, p_reason text, p_customer boolean, p_refund_upi text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.orders; s public.settings; w public.wallets; a jsonb; spend jsonb;
  wk date := date_trunc('week', public._ist_now())::date;
  free boolean := true; fine_added int := 0; refund int := 0;
begin
  select * into o from public.orders where id = p_order for update;
  if o.status = 'cancelled' then return jsonb_build_object('already', true); end if;
  select * into s from public.settings where id = 1;
  select * into w from public.wallets where user_id = o.user_id for update;

  -- Stock and popularity
  update public.products pp set stock = pp.stock + oi.qty from public.order_items oi
   where oi.order_id = o.id and pp.id = oi.product_id;
  update public.product_groups g set sold_count = greatest(0, g.sold_count - x.q)
    from (select pp.group_id, sum(oi.qty) q from public.order_items oi join public.products pp on pp.id = oi.product_id
           where oi.order_id = o.id group by pp.group_id) x
   where g.id = x.group_id;

  -- Slot
  if o.type = 'scheduled' then
    update public.slot_bookings set booked = greatest(0, booked - 1) where slot_date = o.slot_date and window_start = o.slot_start;
  end if;

  -- Coupon comes back
  if o.coupon_code is not null then
    update public.coupon_uses set reverted = true where order_id = o.id and not reverted;
    if found then update public.coupons set used_count = greatest(0, used_count - 1) where code = o.coupon_code; end if;
  end if;

  -- SuperCoins come back to the credits they came from (expired ones get 2 more days)
  if o.coins_used > 0 then
    select alloc into spend from public.coin_ledger where order_id = o.id and entry = 'spend' limit 1;
    for a in select * from jsonb_array_elements(coalesce(spend, '[]'::jsonb)) loop
      update public.coin_ledger
         set remaining = remaining + (a->>'n')::int,
             expires_at = case when expires_at is not null and expires_at < now() + interval '2 days' then now() + interval '2 days' else expires_at end
       where id = (a->>'credit_id')::uuid;
    end loop;
    insert into public.coin_ledger (user_id, entry, amount, remaining, order_id, note)
    values (o.user_id, 'restore', o.coins_used, 0, o.id, 'Returned from cancelled order ' || o.order_no);
    update public.wallets set coin_balance = coin_balance + o.coins_used where user_id = o.user_id;
  end if;

  -- A fine that was settled on this order goes back to pending
  if o.fine_paise > 0 then
    update public.wallets set pending_fine_paise = pending_fine_paise + o.fine_paise where user_id = o.user_id;
  end if;

  -- Customer cancellations: 3 free per week (Mon-Sun IST), then a fine on the next order
  if p_customer then
    if w.week_start <> wk then
      update public.wallets set week_start = wk, week_cancels = 0 where user_id = o.user_id;
      w.week_cancels := 0;
    end if;
    free := w.week_cancels < s.free_cancels_per_week;
    update public.wallets set week_cancels = week_cancels + 1,
      pending_fine_paise = pending_fine_paise + case when free then 0 else s.cancel_fine_paise end,
      updated_at = now()
     where user_id = o.user_id;
    fine_added := case when free then 0 else s.cancel_fine_paise end;
  end if;

  refund := case when o.payment_status = 'paid' then o.payable_paise else 0 end;
  update public.orders set status = 'cancelled', cancel_reason = left(p_reason, 300), cancelled_by = p_by,
    cancel_was_free = case when p_customer then free end, cancelled_at = now(),
    refund_due_paise = refund, refund_upi_id = coalesce(nullif(trim(p_refund_upi), ''), refund_upi_id)
   where id = o.id;
  update public.payments set status = 'expired', updated_at = now() where order_id = o.id and status = 'pending';

  insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'cancelled', auth.uid(), left(p_reason, 300));
  perform public.notify(o.user_id, 'order', 'Order ' || o.order_no || ' cancelled',
    concat_ws(' ',
      case when p_by = 'customer' then null else coalesce(p_reason, 'The store cancelled this order.') end,
      case when refund > 0 then 'Your refund of ' || public._inr(refund) || ' will be sent to your UPI ID within 7 working days.' end,
      case when fine_added > 0 then 'A ' || public._inr(fine_added) || ' cancellation fine will be added to your next order.' end),
    '/orders/' || o.id);
  if p_by <> 'store' then
    perform public.notify_admins('cancelled', 'Order ' || o.order_no || ' cancelled by ' || p_by,
      concat_ws(' ', p_reason, case when refund > 0 then 'Refund due: ' || public._inr(refund) || '.' end), '/admin/orders/' || o.id);
  end if;

  return jsonb_build_object('cancelled', true, 'free', free, 'fine_paise', fine_added, 'refund_paise', refund,
    'free_left', greatest(0, s.free_cancels_per_week - (w.week_cancels + case when p_customer then 1 else 0 end)));
end $$;
revoke execute on function public._cancel_order(uuid, text, text, boolean, text) from anon, authenticated, public;

-- Customer cancels their own order (not once it's out for delivery)
create or replace function public.cancel_order(p_order uuid, p_reason text, p_refund_upi text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  perform public.require_active();
  perform public.hit_rate_limit('cancel_order', 10, 3600);
  select * into o from public.orders where id = p_order and user_id = auth.uid();
  if not found then raise exception 'Order not found'; end if;
  if o.status not in ('placed', 'confirmed', 'getting_ready', 'packed', 'agent_assigned', 'agent_accepted', 'ready_for_pickup') then
    raise exception 'This order can''t be cancelled now. If it''s out for delivery, you can refuse it at the door.';
  end if;
  if o.payment_status = 'paid' and coalesce(trim(p_refund_upi), '') !~ '^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,64}$' then
    raise exception 'Enter the UPI ID where we should send your refund';
  end if;
  return public._cancel_order(o.id, 'customer', coalesce(nullif(trim(p_reason), ''), 'Cancelled by customer'), true, p_refund_upi);
end $$;
revoke execute on function public.cancel_order(uuid, text, text) from anon, public;
grant execute on function public.cancel_order(uuid, text, text) to authenticated;

-- What the customer would pay if they cancelled now (shown in the cancel dialog)
create or replace function public.cancel_preview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.settings; w public.wallets; wk date := date_trunc('week', public._ist_now())::date; used int;
begin
  select * into s from public.settings where id = 1;
  select * into w from public.wallets where user_id = auth.uid();
  used := case when w.week_start = wk then w.week_cancels else 0 end;
  return jsonb_build_object('free_left', greatest(0, s.free_cancels_per_week - used), 'fine_paise', s.cancel_fine_paise);
end $$;
revoke execute on function public.cancel_preview() from anon, public;
grant execute on function public.cancel_preview() to authenticated;

-- Store moves an order along. Agents' own steps (accept, out for delivery, delivered) come in Phase 3.
create or replace function public.admin_set_order_status(p_order uuid, p_status public.order_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders; s public.settings; ok boolean; msg text[];
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if p_status = 'cancelled' then
    perform public._cancel_order(o.id, 'store', coalesce(nullif(trim(p_note), ''), 'The store cancelled this order.'), false);
    return;
  end if;
  ok := case o.status
    when 'placed' then p_status = 'confirmed'
    when 'confirmed' then p_status = 'getting_ready'
    when 'getting_ready' then p_status = 'packed'
    when 'packed' then (o.type = 'pickup' and p_status = 'ready_for_pickup')
    when 'agent_assigned' then p_status in ('packed', 'agent_accepted')
    when 'agent_accepted' then p_status = 'out_for_delivery'
    when 'out_for_delivery' then p_status = 'delivered'
    when 'ready_for_pickup' then p_status = 'collected'
    else false end;
  if not ok then raise exception 'Can''t move this order from % to %', replace(o.status::text, '_', ' '), replace(p_status::text, '_', ' '); end if;
  if p_status = 'confirmed' and o.payment_method = 'upi' and o.payment_status <> 'paid' then
    raise exception 'Verify the UPI payment first';
  end if;
  select * into s from public.settings where id = 1;

  update public.orders set status = p_status,
    agent_id = case when p_status = 'packed' then null else agent_id end,
    confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
    ready_at = case when p_status = 'ready_for_pickup' then now() else ready_at end,
    delivered_at = case when p_status in ('delivered', 'collected') then now() else delivered_at end,
    return_window_ends_at = case when p_status in ('delivered', 'collected') then now() + make_interval(days => s.return_window_days) else return_window_ends_at end,
    payment_status = case when p_status in ('delivered', 'collected') and payment_method in ('cod', 'counter') then 'paid' else payment_status end,
    paid_at = case when p_status in ('delivered', 'collected') and payment_method in ('cod', 'counter') then now() else paid_at end
   where id = o.id
   returning * into o;
  if p_status in ('delivered', 'collected') and o.payment_method in ('cod', 'counter') then
    update public.payments set status = 'success', updated_at = now() where order_id = o.id and status = 'pending';
  end if;
  insert into public.order_events (order_id, status, actor_id, note) values (o.id, p_status::text, auth.uid(), left(p_note, 300));
  msg := public._status_message(p_status, o);
  perform public.notify(o.user_id, 'order', msg[1], msg[2], '/orders/' || o.id);
end $$;
revoke execute on function public.admin_set_order_status(uuid, public.order_status, text) from anon, public;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text) to authenticated;

create or replace function public.admin_assign_agent(p_order uuid, p_agent uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders; ag public.profiles; msg text[];
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if o.type = 'pickup' then raise exception 'Pickup orders don''t need a delivery partner'; end if;
  if o.status not in ('packed', 'agent_assigned') then raise exception 'Pack the order before assigning a delivery partner'; end if;
  select * into ag from public.profiles where id = p_agent and role = 'delivery_agent';
  if not found then raise exception 'That person isn''t a delivery agent'; end if;
  update public.orders set agent_id = ag.id, status = 'agent_assigned' where id = o.id returning * into o;
  insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'agent_assigned', auth.uid(), ag.name);
  perform public.notify(ag.id, 'job', 'New delivery: ' || o.order_no, 'Open the agent portal to accept it.', '/agent');
  msg := public._status_message('agent_assigned', o);
  perform public.notify(o.user_id, 'order', msg[1], msg[2], '/orders/' || o.id);
end $$;
revoke execute on function public.admin_assign_agent(uuid, uuid) from anon, public;
grant execute on function public.admin_assign_agent(uuid, uuid) to authenticated;

-- Customer reports the UPI reference after paying; the store verifies it
create or replace function public.submit_upi_utr(p_order uuid, p_utr text) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders; u text := regexp_replace(coalesce(p_utr, ''), '\s', '', 'g');
begin
  perform public.require_active();
  perform public.hit_rate_limit('submit_utr', 10, 3600);
  select * into o from public.orders where id = p_order and user_id = auth.uid();
  if not found then raise exception 'Order not found'; end if;
  if o.payment_method <> 'upi' or o.status <> 'placed' then raise exception 'This order isn''t waiting for a UPI payment'; end if;
  if u !~ '^[0-9]{12}$' then raise exception 'The UPI reference (UTR) is the 12-digit number in your payment app'; end if;
  if exists (select 1 from public.payments where utr = u and order_id <> o.id) then raise exception 'That reference was already used for another order'; end if;
  update public.payments set utr = u, raw = coalesce(raw, '{}'::jsonb) || jsonb_build_object('submitted_at', now()), updated_at = now()
   where order_id = o.id and method = 'upi';
  perform public.notify_admins('payment', 'Check UPI payment for ' || o.order_no,
    public._inr(o.payable_paise) || ', reference ' || u, '/admin/orders/' || o.id);
end $$;
revoke execute on function public.submit_upi_utr(uuid, text) from anon, public;
grant execute on function public.submit_upi_utr(uuid, text) to authenticated;

create or replace function public.admin_mark_paid(p_order uuid, p_utr text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders; msg text[];
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status = 'cancelled' then raise exception 'This order is cancelled'; end if;
  update public.payments set status = 'success', utr = coalesce(nullif(trim(p_utr), ''), utr), reconciled_by = auth.uid(), updated_at = now()
   where order_id = o.id;
  update public.orders set payment_status = 'paid', paid_at = now(),
    status = case when status = 'placed' then 'confirmed' else status end,
    confirmed_at = case when status = 'placed' then now() else confirmed_at end
   where id = o.id returning * into o;
  insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'payment_verified', auth.uid(), null);
  if o.status = 'confirmed' then
    insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'confirmed', auth.uid(), null);
  end if;
  msg := public._status_message('confirmed', o);
  perform public.notify(o.user_id, 'order', 'Payment received for ' || o.order_no, msg[2], '/orders/' || o.id);
end $$;
revoke execute on function public.admin_mark_paid(uuid, text) from anon, public;
grant execute on function public.admin_mark_paid(uuid, text) to authenticated;

-- Scheduled clean-ups
create or replace function public._expire_unpaid_upi() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select o.id from public.orders o join public.payments pay on pay.order_id = o.id
            where o.status = 'placed' and o.payment_method = 'upi' and pay.utr is null
              and o.created_at < now() - interval '30 minutes' loop
    perform public._cancel_order(r.id, 'system', 'UPI payment wasn''t received within 30 minutes.', false);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public._expire_pickups() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; s public.settings;
begin
  select * into s from public.settings where id = 1;
  for r in select id from public.orders
            where status = 'ready_for_pickup' and ready_at < now() - make_interval(hours => s.pickup_hold_hours) loop
    perform public._cancel_order(r.id, 'system', 'Not collected within ' || s.pickup_hold_hours || ' hours.', false);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public._expire_unpaid_upi(), public._expire_pickups() from anon, authenticated, public;
