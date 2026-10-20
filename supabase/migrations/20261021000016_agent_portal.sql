-- Phase 3: delivery partner actions

-- Locks the order and checks it belongs to the calling agent
create or replace function public._agent_order(p_order uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  if not public.is_agent() then raise exception 'Delivery partners only' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order for update;
  if not found or o.agent_id is distinct from auth.uid() then raise exception 'This delivery isn''t assigned to you'; end if;
  return o;
end $$;
revoke execute on function public._agent_order(uuid) from anon, authenticated, public;

create or replace function public.agent_set_online(p_online boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_agent() then raise exception 'Delivery partners only' using errcode = '42501'; end if;
  update public.profiles set agent_online = coalesce(p_online, false) where id = auth.uid();
end $$;

create or replace function public.agent_accept(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders; msg text[];
begin
  o := public._agent_order(p_order);
  if o.status <> 'agent_assigned' then raise exception 'This delivery can''t be accepted now'; end if;
  update public.orders set status = 'agent_accepted' where id = o.id returning * into o;
  insert into public.order_events (order_id, status, actor_id) values (o.id, 'agent_accepted', auth.uid());
  msg := public._status_message('agent_accepted', o);
  perform public.notify(o.user_id, 'order', msg[1], msg[2], '/orders/' || o.id);
end $$;

create or replace function public.agent_decline(p_order uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders; who text;
begin
  o := public._agent_order(p_order);
  if o.status not in ('agent_assigned', 'agent_accepted') then raise exception 'You can only hand back a delivery before you leave the store'; end if;
  select coalesce(name, 'Delivery partner') into who from public.profiles where id = auth.uid();
  update public.orders set status = 'packed', agent_id = null where id = o.id;
  insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'agent_declined', auth.uid(), left(nullif(trim(p_reason), ''), 200));
  perform public.notify_admins('order', who || ' handed back ' || o.order_no,
    coalesce(nullif(trim(p_reason), ''), 'Assign another partner.'), '/admin/orders/' || o.id);
end $$;

create or replace function public.agent_start_delivery(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders; msg text[];
begin
  o := public._agent_order(p_order);
  if o.status <> 'agent_accepted' then raise exception 'Accept the delivery first'; end if;
  update public.orders set status = 'out_for_delivery' where id = o.id returning * into o;  -- trigger makes and emails the code
  insert into public.order_events (order_id, status, actor_id) values (o.id, 'out_for_delivery', auth.uid());
  msg := public._status_message('out_for_delivery', o);
  perform public.notify(o.user_id, 'order', msg[1], msg[2], '/orders/' || o.id);
end $$;

create or replace function public.agent_resend_code(p_order uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare o public.orders; c public.order_otps;
begin
  o := public._agent_order(p_order);
  if o.status <> 'out_for_delivery' then raise exception 'The order isn''t out for delivery'; end if;
  select * into c from public.order_otps where order_id = o.id;
  if c.emailed_count >= 4 then raise exception 'The code was already emailed several times. Ask the customer to check the Gupta Ink app.'; end if;
  if c.last_emailed_at > now() - interval '1 minute' then raise exception 'Wait a minute before sending again'; end if;
  perform public.notify(o.user_id, 'order', 'Your delivery code', 'Open your order to see the code for ' || o.order_no || '.', '/orders/' || o.id);
  return public._email_delivery_code(o.id);
end $$;

-- Customer not reachable, wrong address and so on. The store decides what happens next.
create or replace function public.agent_report_issue(p_order uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  o := public._agent_order(p_order);
  if coalesce(trim(p_note), '') = '' then raise exception 'Say what went wrong'; end if;
  perform public.hit_rate_limit('agent_issue', 10, 3600);
  insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'delivery_issue', auth.uid(), left(trim(p_note), 300));
  perform public.notify_admins('order', 'Delivery problem: ' || o.order_no, left(trim(p_note), 200), '/admin/orders/' || o.id);
end $$;

-- Hand-over: the right code (and cash, for COD) completes the order
create or replace function public.agent_complete(p_order uuid, p_code text, p_cash_collected boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.orders; c public.order_otps; s public.settings; msg text[]; left_tries int;
begin
  o := public._agent_order(p_order);
  if o.status <> 'out_for_delivery' then raise exception 'Start the delivery first'; end if;
  if o.otp_attempts >= 5 then raise exception 'Too many wrong codes. Call the store to finish this delivery.'; end if;
  select * into c from public.order_otps where order_id = o.id;
  if c.code is null or regexp_replace(coalesce(p_code, ''), '\D', '', 'g') <> c.code then
    update public.orders set otp_attempts = otp_attempts + 1 where id = o.id returning * into o;
    left_tries := 5 - o.otp_attempts;
    if left_tries = 0 then
      perform public.notify_admins('order', 'Delivery code locked: ' || o.order_no, 'Five wrong codes. Check with the customer.', '/admin/orders/' || o.id);
    end if;
    return jsonb_build_object('ok', false, 'tries_left', left_tries);
  end if;
  if o.payment_method = 'cod' and o.payment_status <> 'paid' and not coalesce(p_cash_collected, false) then
    raise exception 'Collect % in cash first', public._inr(o.payable_paise);
  end if;
  select * into s from public.settings where id = 1;
  update public.orders set status = 'delivered', delivered_at = now(),
    return_window_ends_at = now() + make_interval(days => s.return_window_days),
    payment_status = case when payment_method = 'cod' then 'paid' else payment_status end,
    paid_at = case when payment_method = 'cod' then now() else paid_at end
   where id = o.id returning * into o;
  if o.payment_method = 'cod' then
    update public.payments set status = 'success', raw = coalesce(raw, '{}'::jsonb) || jsonb_build_object('cash_with', auth.uid()), updated_at = now()
     where order_id = o.id and status = 'pending';
  end if;
  insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'delivered', auth.uid(),
    case when o.payment_method = 'cod' then 'Cash ' || public._inr(o.payable_paise) || ' collected' end);
  msg := public._status_message('delivered', o);
  perform public.notify(o.user_id, 'order', msg[1], msg[2], '/orders/' || o.id);
  perform public.notify_admins('order', o.order_no || ' delivered',
    case when o.payment_method = 'cod' then 'Partner has ' || public._inr(o.payable_paise) || ' cash to hand in.' else null end, '/admin/orders/' || o.id);
  return jsonb_build_object('ok', true);
end $$;

do $$
declare f text;
begin
  foreach f in array array['agent_set_online(boolean)', 'agent_accept(uuid)', 'agent_decline(uuid, text)', 'agent_start_delivery(uuid)',
                           'agent_resend_code(uuid)', 'agent_report_issue(uuid, text)', 'agent_complete(uuid, text, boolean)'] loop
    execute format('revoke execute on function public.%s from anon, public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
