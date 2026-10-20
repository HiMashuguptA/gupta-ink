-- Phase 4: returns and refunds

alter table public.returns add column if not exists pickup_address jsonb;
alter table public.returns add column if not exists restocked boolean not null default false;
alter table public.returns add column if not exists refunded_at timestamptz;
alter table public.orders add column if not exists refund_utr text;
alter table public.orders add column if not exists refund_proof_path text;
alter table public.orders add column if not exists refunded_at timestamptz;
create index if not exists returns_order_idx on public.returns (order_id);
create index if not exists returns_status_idx on public.returns (status);

-- What part of each rupee of items the customer actually paid (coupon and coins shared out)
create or replace function public._paid_share(o public.orders) returns numeric
language sql immutable set search_path = '' as $$
  select case when o.items_total_paise > 0
    then greatest(0, o.items_total_paise - o.coupon_discount_paise - o.coins_used * 100)::numeric / o.items_total_paise
    else 0 end
$$;

-- Items the customer can still return, with the refund for one unit of each
create or replace function public.return_options(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare o public.orders; share numeric;
begin
  select * into o from public.orders where id = p_order and user_id = auth.uid();
  if not found then raise exception 'Order not found'; end if;
  share := public._paid_share(o);
  return jsonb_build_object(
    'open', o.status in ('delivered', 'collected') and o.return_window_ends_at > now(),
    'window_ends_at', o.return_window_ends_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'order_item_id', oi.id, 'name', oi.name, 'variant_label', oi.variant_label, 'image_url', oi.image_url,
        'qty', oi.qty, 'returnable', oi.returnable, 'price_paise', oi.price_paise,
        'available', greatest(0, oi.qty - coalesce(taken.n, 0)),
        'unit_refund_paise', floor(oi.price_paise * share / 100) * 100) order by oi.name)
      from public.order_items oi
      left join lateral (
        select sum((x->>'qty')::int) n from public.returns r, jsonb_array_elements(r.items) x
         where r.order_id = o.id and r.status <> 'rejected' and (x->>'order_item_id')::uuid = oi.id) taken on true
      where oi.order_id = o.id), '[]'::jsonb));
end $$;

create or replace function public.request_return(p_order uuid, p_items jsonb, p_reason text, p_photos text[], p_refund_upi text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  o public.orders; opts jsonb; it jsonb; opt jsonb; q int; total int := 0; snap jsonb := '[]'; rid uuid; ph text;
  upi text := lower(trim(coalesce(p_refund_upi, '')));
begin
  perform public.require_active();
  perform public.hit_rate_limit('request_return', 5, 3600);
  select * into o from public.orders where id = p_order and user_id = auth.uid() for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status not in ('delivered', 'collected') or o.return_window_ends_at is null or o.return_window_ends_at <= now() then
    raise exception 'The return window for this order has closed';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'Tell us what''s wrong (at least a few words)'; end if;
  if coalesce(array_length(p_photos, 1), 0) not between 1 and 5 then raise exception 'Add 1 to 5 photos of the items'; end if;
  foreach ph in array p_photos loop
    if strpos(ph, auth.uid()::text || '/') <> 1 or strpos(ph, '..') > 0 then raise exception 'Upload the photos again'; end if;
  end loop;
  if upi !~ '^[a-z0-9._-]{2,64}@[a-z]{2,64}$' then raise exception 'Enter a valid UPI ID for the refund, like name@okaxis'; end if;

  opts := public.return_options(o.id)->'items';
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    q := coalesce((it->>'qty')::int, 0);
    if q < 1 then continue; end if;
    opt := null;
    select x into opt from jsonb_array_elements(opts) x where x->>'order_item_id' = it->>'order_item_id';
    if opt is null then raise exception 'That item isn''t in this order'; end if;
    if not (opt->>'returnable')::boolean then raise exception '% can''t be returned', opt->>'name'; end if;
    if q > (opt->>'available')::int then raise exception 'You can return up to % of %', opt->>'available', opt->>'name'; end if;
    total := total + q * (opt->>'unit_refund_paise')::int;
    snap := snap || jsonb_build_object('order_item_id', opt->>'order_item_id', 'name', opt->>'name', 'variant_label', opt->>'variant_label',
      'image_url', opt->>'image_url', 'qty', q, 'unit_refund_paise', (opt->>'unit_refund_paise')::int);
  end loop;
  if jsonb_array_length(snap) = 0 then raise exception 'Choose at least one item to return'; end if;

  insert into public.returns (order_id, user_id, items, reason, photos, refund_upi_id, refund_amount_paise, pickup_address)
  values (o.id, o.user_id, snap, left(trim(p_reason), 1000), p_photos, upi, total, o.address)
  returning id into rid;
  insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'return_requested', auth.uid(), public._inr(total));
  perform public.notify_admins('return', 'Return requested on ' || o.order_no, public._inr(total) || ' · ' || left(trim(p_reason), 120), '/admin/returns/' || rid);
  perform public.notify(o.user_id, 'return', 'Return request received',
    'We''ll check it within a day. If approved, ' || public._inr(total) || ' goes to ' || upi || '.', '/orders/' || o.id);
  return rid;
end $$;

-- ------------------------------------------------------------- store side
create or replace function public._lock_return(p_return uuid) returns public.returns
language plpgsql security definer set search_path = '' as $$
declare r public.returns;
begin
  select * into r from public.returns where id = p_return for update;
  if not found then raise exception 'Return not found'; end if;
  return r;
end $$;
revoke execute on function public._lock_return(uuid) from anon, authenticated, public;

create or replace function public.admin_review_return(p_return uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.returns; o public.orders;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  r := public._lock_return(p_return);
  if r.status <> 'requested' then raise exception 'This return was already reviewed'; end if;
  if not p_approve and coalesce(trim(p_note), '') = '' then raise exception 'Give the customer a reason'; end if;
  select * into o from public.orders where id = r.order_id;
  update public.returns set status = case when p_approve then 'approved' else 'rejected' end::public.return_status,
    admin_note = nullif(trim(p_note), ''), updated_at = now() where id = r.id;
  perform public.notify(r.user_id, 'return',
    case when p_approve then 'Return approved' else 'Return not approved' end,
    case when p_approve then
      case when o.type = 'pickup' then 'Bring the items to the store at Khedi Market. ' else 'Our partner will collect the items. ' end
      || 'Refund: ' || public._inr(r.refund_amount_paise) || '.'
    else trim(p_note) end, '/orders/' || r.order_id);
end $$;

create or replace function public.admin_assign_return_agent(p_return uuid, p_agent uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.returns; o public.orders;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  r := public._lock_return(p_return);
  if r.status not in ('approved', 'pickup_assigned') then raise exception 'Approve the return first'; end if;
  if not exists (select 1 from public.profiles where id = p_agent and role = 'delivery_agent') then raise exception 'That person isn''t a delivery agent'; end if;
  select * into o from public.orders where id = r.order_id;
  update public.returns set agent_id = p_agent, status = 'pickup_assigned', updated_at = now() where id = r.id;
  perform public.notify(p_agent, 'job', 'Return pickup: ' || o.order_no, 'Collect the items and bring them to the store.', '/agent');
  perform public.notify(r.user_id, 'return', 'Pickup arranged', 'A delivery partner will collect your return soon.', '/orders/' || r.order_id);
end $$;

create or replace function public.agent_return_picked_up(p_return uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.returns; o public.orders;
begin
  if not public.is_agent() then raise exception 'Delivery partners only' using errcode = '42501'; end if;
  r := public._lock_return(p_return);
  if r.agent_id is distinct from auth.uid() then raise exception 'This pickup isn''t assigned to you'; end if;
  if r.status <> 'pickup_assigned' then raise exception 'This pickup is already done'; end if;
  select * into o from public.orders where id = r.order_id;
  update public.returns set status = 'picked_up', updated_at = now() where id = r.id;
  perform public.notify_admins('return', 'Return picked up: ' || o.order_no, 'Check the items when they reach the store.', '/admin/returns/' || r.id);
  perform public.notify(r.user_id, 'return', 'Return picked up', 'We''ll check the items and send your refund.', '/orders/' || r.order_id);
end $$;

-- Items reached the store. Restock if they can be sold again.
create or replace function public.admin_receive_return(p_return uuid, p_restock boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.returns; x jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  r := public._lock_return(p_return);
  if r.status not in ('approved', 'pickup_assigned', 'picked_up') then raise exception 'This return can''t be marked received now'; end if;
  for x in select * from jsonb_array_elements(r.items) loop
    update public.order_items set returned_qty = returned_qty + (x->>'qty')::int where id = (x->>'order_item_id')::uuid;
    if p_restock then
      update public.products p set stock = p.stock + (x->>'qty')::int
        from public.order_items oi where oi.id = (x->>'order_item_id')::uuid and p.id = oi.product_id;
    end if;
  end loop;
  update public.returns set status = 'received', restocked = coalesce(p_restock, false), updated_at = now() where id = r.id;
end $$;

-- Refund sent by UPI; the screenshot is the proof the customer sees
create or replace function public.admin_refund_return(p_return uuid, p_proof_path text, p_utr text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.returns; o public.orders; refunded int; u text := nullif(regexp_replace(coalesce(p_utr, ''), '\s', '', 'g'), '');
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  r := public._lock_return(p_return);
  if r.status <> 'received' then raise exception 'Mark the items received before refunding'; end if;
  if coalesce(p_proof_path, '') = '' or strpos(p_proof_path, r.user_id::text || '/') <> 1 then raise exception 'Upload the payment screenshot'; end if;
  if u is not null and u !~ '^[0-9]{12}$' then raise exception 'The UTR is the 12-digit number in your UPI app'; end if;
  update public.returns set status = 'refunded', refund_proof_path = p_proof_path, refund_utr = u, refunded_at = now(), updated_at = now() where id = r.id;
  select * into o from public.orders where id = r.order_id for update;
  select coalesce(sum(refund_amount_paise), 0) into refunded from public.returns where order_id = o.id and status = 'refunded';
  update public.orders set payment_status = case when refunded >= o.payable_paise then 'refunded' else 'partially_refunded' end::public.payment_status where id = o.id;
  insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'return_refunded', auth.uid(), public._inr(r.refund_amount_paise));
  perform public.notify(r.user_id, 'return', 'Refund sent: ' || public._inr(r.refund_amount_paise),
    'Sent to ' || r.refund_upi_id || coalesce(', reference ' || u, '') || '. The screenshot is on your order.', '/orders/' || r.order_id);
end $$;

-- Refund for a paid order that was cancelled
create or replace function public.admin_mark_refund_paid(p_order uuid, p_proof_path text, p_utr text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders; u text := nullif(regexp_replace(coalesce(p_utr, ''), '\s', '', 'g'), '');
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if o.refund_due_paise <= 0 or o.refunded_at is not null then raise exception 'No refund is due on this order'; end if;
  if coalesce(p_proof_path, '') = '' or strpos(p_proof_path, o.user_id::text || '/') <> 1 then raise exception 'Upload the payment screenshot'; end if;
  if u is not null and u !~ '^[0-9]{12}$' then raise exception 'The UTR is the 12-digit number in your UPI app'; end if;
  update public.orders set refund_utr = u, refund_proof_path = p_proof_path, refunded_at = now(), payment_status = 'refunded' where id = o.id;
  update public.payments set status = 'refunded', updated_at = now() where order_id = o.id and status = 'success';
  insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'refunded', auth.uid(), public._inr(o.refund_due_paise));
  perform public.notify(o.user_id, 'order', 'Refund sent: ' || public._inr(o.refund_due_paise),
    'Sent to ' || coalesce(o.refund_upi_id, 'your UPI ID') || coalesce(', reference ' || u, '') || '.', '/orders/' || o.id);
end $$;

do $$
declare f text;
begin
  foreach f in array array['return_options(uuid)', 'request_return(uuid, jsonb, text, text[], text)', 'admin_review_return(uuid, boolean, text)',
    'admin_assign_return_agent(uuid, uuid)', 'agent_return_picked_up(uuid)', 'admin_receive_return(uuid, boolean)',
    'admin_refund_return(uuid, text, text)', 'admin_mark_refund_paid(uuid, text, text)'] loop
    execute format('revoke execute on function public.%s from anon, public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke execute on function public._paid_share(public.orders) from anon, authenticated, public;
