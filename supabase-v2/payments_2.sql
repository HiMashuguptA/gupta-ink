-- Online payments (Cashfree): an order only counts once it is paid. Refunds go back automatically.

-- 1. Refund queue: the worker sends each one to Cashfree and tracks it until the bank confirms.
create table if not exists public.gateway_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  return_id uuid references public.returns(id) on delete set null,
  amount_paise int not null check (amount_paise > 0),
  reason text,
  cf_order_id text not null,
  status text not null default 'queued' check (status in ('queued', 'pending', 'success', 'failed')),
  cf_refund_id text,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gateway_refunds_open_idx on public.gateway_refunds (status) where status in ('queued', 'pending');
create index if not exists gateway_refunds_order_idx on public.gateway_refunds (order_id);
create index if not exists gateway_refunds_return_idx on public.gateway_refunds (return_id);
alter table public.gateway_refunds enable row level security;
drop policy if exists gateway_refunds_read on public.gateway_refunds;
create policy gateway_refunds_read on public.gateway_refunds for select to authenticated
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = public.uid()));
revoke insert, update, delete on public.gateway_refunds from anon, authenticated;

-- The Cashfree order that took the money for this order (null when not paid online)
create or replace function public._gateway_order_ref(p_order uuid) returns text
language sql stable security definer set search_path = '' as $$
  select gateway_ref from public.payments where order_id = p_order and status in ('success', 'refunded') and gateway_ref is not null
  order by updated_at desc limit 1
$$;

create or replace function public._queue_gateway_refund(p_order uuid, p_amount int, p_return uuid, p_reason text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare ref text := public._gateway_order_ref(p_order); already int;
begin
  if ref is null or coalesce(p_amount, 0) <= 0 then return false; end if;
  select coalesce(sum(amount_paise), 0) into already from public.gateway_refunds
   where order_id = p_order and status <> 'failed' and return_id is not distinct from p_return;
  if already >= p_amount then return true; end if;
  insert into public.gateway_refunds (order_id, return_id, amount_paise, reason, cf_order_id)
  values (p_order, p_return, p_amount - already, left(p_reason, 200), ref);
  return true;
end $$;
revoke all on function public._queue_gateway_refund(uuid, int, uuid, text), public._gateway_order_ref(uuid) from public, anon, authenticated;

-- Worker: next refunds to send or check
create or replace function public._refunds_take(p_limit int default 10) returns setof public.gateway_refunds
language sql security definer set search_path = '' as $$
  update public.gateway_refunds set attempts = attempts + 1, updated_at = now()
   where id in (select id from public.gateway_refunds where status in ('queued', 'pending') and attempts < 200
                order by created_at limit p_limit for update skip locked)
  returning *;
$$;

-- Worker: record what Cashfree said
create or replace function public._refund_update(p_id uuid, p_status text, p_cf_refund_id text default null, p_error text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.gateway_refunds; o public.orders; total int; done int;
begin
  select * into g from public.gateway_refunds where id = p_id for update;
  if not found or g.status = 'success' then return; end if;
  update public.gateway_refunds set status = p_status, cf_refund_id = coalesce(p_cf_refund_id, cf_refund_id),
    error = case when p_status = 'failed' then left(p_error, 300) else null end, updated_at = now()
   where id = g.id;
  select * into o from public.orders where id = g.order_id for update;
  if p_status = 'success' then
    if g.return_id is not null then
      update public.returns set status = 'refunded', refunded_at = now(), refund_utr = left(p_cf_refund_id, 40), updated_at = now() where id = g.return_id;
      select coalesce(sum(refund_amount_paise), 0) into done from public.returns where order_id = o.id and status = 'refunded';
      update public.orders set payment_status = case when done >= o.payable_paise then 'refunded' else 'partially_refunded' end::public.payment_status where id = o.id;
      insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'return_refunded', null, public._inr(g.amount_paise) || ' via Cashfree');
    else
      select coalesce(sum(amount_paise), 0) into total from public.gateway_refunds where order_id = o.id and return_id is null and status = 'success';
      update public.orders set refunded_at = now(), refund_utr = left(p_cf_refund_id, 40),
        payment_status = case when total >= o.payable_paise then 'refunded' else 'partially_refunded' end::public.payment_status
       where id = o.id;
      update public.payments set status = 'refunded', updated_at = now() where order_id = o.id and status = 'success';
      insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'refunded', null, public._inr(g.amount_paise) || ' via Cashfree');
    end if;
    perform public.notify(o.user_id, 'order', 'Refund of ' || public._inr(g.amount_paise) || ' started',
      'It goes back to the UPI app, card or bank you paid with. Banks usually show it in 3 to 7 working days.', '/orders/' || o.id);
  elsif p_status = 'failed' then
    perform public.notify_admins('payment', 'Refund failed for ' || o.order_no,
      public._inr(g.amount_paise) || ': ' || coalesce(left(p_error, 200), 'Cashfree refused it') || '. Refund by UPI and mark it in the order.', '/admin/orders/' || o.id);
  end if;
end $$;
revoke all on function public._refunds_take(int), public._refund_update(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public._refunds_take(int), public._refund_update(uuid, text, text, text) to service_role;

-- 2. Payment arrives: only now does the order exist for the store
create or replace function public._gateway_paid(p_order uuid, p_utr text, p_amount_paise int, p_raw jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare o public.orders; msg text[]; cf text := nullif(p_raw->>'cf_order', '');
begin
  select * into o from public.orders where id = p_order for update;
  if not found then return false; end if;
  if o.payment_status in ('paid', 'refunded', 'partially_refunded') then return true; end if;
  if p_amount_paise < o.payable_paise then
    update public.payments set raw = coalesce(raw, '{}'::jsonb) || jsonb_build_object('short_payment', p_raw) where order_id = o.id;
    perform public.notify_admins('payment', 'Short payment on ' || o.order_no, 'Paid ' || public._inr(p_amount_paise) || ' of ' || public._inr(o.payable_paise) || '. Check it in Cashfree.', '/admin/orders/' || o.id);
    return false;
  end if;
  update public.payments set status = 'success', gateway_ref = coalesce(cf, gateway_ref), utr = coalesce(nullif(trim(p_utr), ''), utr),
    raw = coalesce(raw, '{}'::jsonb) || jsonb_build_object('gateway', p_raw), updated_at = now()
   where order_id = o.id;

  -- Paid after the order had already expired: keep it cancelled and send the money straight back
  if o.status = 'cancelled' then
    update public.orders set payment_status = 'paid', paid_at = now(), refund_due_paise = p_amount_paise where id = o.id;
    perform public._queue_gateway_refund(o.id, p_amount_paise, null, 'Paid after the order expired');
    perform public.notify(o.user_id, 'order', 'Payment for ' || o.order_no || ' came in late',
      'The order had already expired, so we are refunding ' || public._inr(p_amount_paise) || ' to your account automatically.', '/orders/' || o.id);
    return true;
  end if;

  update public.orders set payment_status = 'paid', paid_at = now(),
    status = case when status in ('awaiting_payment', 'placed') then 'confirmed' else status end,
    confirmed_at = case when status in ('awaiting_payment', 'placed') then now() else confirmed_at end
   where id = o.id returning * into o;
  insert into public.order_events (order_id, status, actor_id, note) values
    (o.id, 'placed', o.user_id, null),
    (o.id, 'payment_verified', null, 'Paid online (Cashfree)'),
    (o.id, 'confirmed', null, null);
  msg := public._status_message('confirmed', o);
  perform public.notify(o.user_id, 'order', 'Order ' || o.order_no || ' confirmed. Payment received', msg[2], '/orders/' || o.id);
  perform public.notify_admins('new_order', 'New order ' || o.order_no || ': ' || public._inr(o.payable_paise),
    initcap(o.type::text) || ', paid online', '/admin/orders/' || o.id);
  return true;
end $$;
revoke all on function public._gateway_paid(uuid, text, int, jsonb) from public, anon, authenticated;
grant execute on function public._gateway_paid(uuid, text, int, jsonb) to service_role;

-- 3. Unpaid online orders give their stock back after 25 minutes (the payment page closes at 20)
create or replace function public._expire_unpaid_upi() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select o.id from public.orders o
            where o.payment_method = 'upi' and o.payment_status = 'pending'
              and ((o.status = 'awaiting_payment' and o.created_at < now() - interval '25 minutes')
                or (o.status = 'placed' and o.created_at < now() - interval '30 minutes'
                    and not exists (select 1 from public.payments p where p.order_id = o.id and p.utr is not null))) loop
    perform public._cancel_order(r.id, 'system', 'Payment wasn''t completed, so the order was not placed.', false);
    n := n + 1;
  end loop;
  return n;
end $$;

-- 4. Admin: refund a received return through Cashfree (online-paid orders)
create or replace function public.admin_refund_return_gateway(p_return uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.returns;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  r := public._lock_return(p_return);
  if r.status <> 'received' then raise exception 'Mark the items received before refunding'; end if;
  if not public._queue_gateway_refund(r.order_id, r.refund_amount_paise, r.id, 'Return') then
    raise exception 'This order wasn''t paid online. Refund by UPI and upload the screenshot instead.';
  end if;
  insert into public.order_events (order_id, status, actor_id, note) values (r.order_id, 'refund_started', public.uid(), public._inr(r.refund_amount_paise) || ' via Cashfree');
end $$;
revoke all on function public.admin_refund_return_gateway(uuid) from public, anon;
grant execute on function public.admin_refund_return_gateway(uuid) to authenticated;

-- Admin: retry a refund Cashfree refused
create or replace function public.admin_retry_refund(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  update public.gateway_refunds set status = 'queued', error = null, cf_refund_id = null, attempts = 0, updated_at = now()
   where id = p_id and status = 'failed';
  if not found then raise exception 'Only failed refunds can be retried'; end if;
end $$;
revoke all on function public.admin_retry_refund(uuid) from public, anon;
grant execute on function public.admin_retry_refund(uuid) to authenticated;

-- Is this order paid online? (cancel dialog skips asking for a UPI ID)
create or replace function public.order_paid_online(p_order uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orders o where o.id = p_order and (o.user_id = public.uid() or public.is_admin()))
     and public._gateway_order_ref(p_order) is not null
$$;
grant execute on function public.order_paid_online(uuid) to authenticated;

-- 5. Patch the existing functions in place (same text-replace approach as the Clerk conversion)
do $$
declare d text;
begin
  -- place_order: online orders start as awaiting_payment, with no "order placed" messages yet
  d := pg_get_functiondef('public.place_order(jsonb)'::regprocedure);
  d := replace(d, $q$first_status := case when pm = 'upi' then 'placed' else 'confirmed' end;$q$,
                  $q$first_status := case when pm = 'upi' then 'awaiting_payment' else 'confirmed' end;$q$);
  d := replace(d, $q$  insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'placed', uid, null);$q$,
                  $q$  if pm <> 'upi' then
  insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'placed', uid, null);$q$);
  d := replace(d, $q$'/admin/orders/' || o.id);

  return jsonb_build_object$q$, $q$'/admin/orders/' || o.id);
  end if;

  return jsonb_build_object$q$);
  if d not like '%awaiting_payment%' or d not like '%if pm <> ''upi'' then%' or d not like '%end if;%return jsonb_build_object%' then
    raise exception 'place_order patch did not apply';
  end if;
  execute d;

  -- _cancel_order: online payments are refunded through Cashfree automatically
  d := pg_get_functiondef('public._cancel_order(uuid, text, text, boolean, text)'::regprocedure);
  d := replace(d, $q$  update public.payments set status = 'expired', updated_at = now() where order_id = o.id and status = 'pending';$q$,
                  $q$  update public.payments set status = 'expired', updated_at = now() where order_id = o.id and status = 'pending';
  if refund > 0 then perform public._queue_gateway_refund(o.id, refund, null, left(p_reason, 200)); end if;$q$);
  d := replace(d, $q$'Your refund of ' || public._inr(refund) || ' will be sent to your UPI ID within 7 working days.'$q$,
                  $q$'Your refund of ' || public._inr(refund) || case when public._gateway_order_ref(o.id) is not null then ' goes back to the account you paid from (3 to 7 working days).' else ' will be sent to your UPI ID within 7 working days.' end$q$);
  if d not like '%_queue_gateway_refund%' then raise exception '_cancel_order patch did not apply'; end if;
  execute d;

  -- cancel_order: unpaid online orders can be dropped with no fine; online-paid ones need no UPI ID
  d := pg_get_functiondef('public.cancel_order(uuid, text, text)'::regprocedure);
  d := replace(d, $q$if o.status not in ('placed',$q$, $q$if o.status not in ('awaiting_payment', 'placed',$q$);
  d := replace(d, $q$if o.payment_status = 'paid' and coalesce$q$, $q$if o.payment_status = 'paid' and public._gateway_order_ref(o.id) is null and coalesce$q$);
  d := replace(d, $q$coalesce(nullif(trim(p_reason), ''), 'Cancelled by customer'), true, p_refund_upi)$q$,
                  $q$coalesce(nullif(trim(p_reason), ''), 'Cancelled by customer'), o.status <> 'awaiting_payment', p_refund_upi)$q$);
  if d not like '%awaiting_payment%_gateway_order_ref%' then raise exception 'cancel_order patch did not apply'; end if;
  execute d;

  -- admin_mark_paid / submit_upi_utr: also accept awaiting_payment (direct UPI to the store's ID)
  d := pg_get_functiondef('public.admin_mark_paid(uuid, text)'::regprocedure);
  d := replace(d, $q$status = case when status = 'placed' then 'confirmed' else status end,$q$, $q$status = case when status in ('placed', 'awaiting_payment') then 'confirmed' else status end,$q$);
  d := replace(d, $q$confirmed_at = case when status = 'placed' then now() else confirmed_at end$q$, $q$confirmed_at = case when status in ('placed', 'awaiting_payment') then now() else confirmed_at end$q$);
  execute d;
  d := pg_get_functiondef('public.submit_upi_utr(uuid, text)'::regprocedure);
  d := replace(d, $q$o.status <> 'placed'$q$, $q$o.status not in ('placed', 'awaiting_payment')$q$);
  d := replace(d, $q$  perform public.notify_admins('payment', 'Check UPI payment for ' || o.order_no,$q$,
                  $q$  if o.status = 'awaiting_payment' then
    update public.orders set status = 'placed' where id = o.id;
    insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'placed', o.user_id, 'UPI reference submitted');
  end if;
  perform public.notify_admins('payment', 'Check UPI payment for ' || o.order_no,$q$);
  execute d;
end $$;
