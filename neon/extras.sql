-- ---------------------------------------------------------------------------------------------
-- Neon-only pieces: sign-up through Clerk, email and WhatsApp sent by the Cloudflare worker,
-- keys kept in private.secrets, and Data API grants.
-- ---------------------------------------------------------------------------------------------

grant usage on schema public to anonymous, authenticated;
revoke truncate, trigger, references on all tables in schema public from anonymous, authenticated;
grant execute on function public.uid(), public.jwt() to anonymous, authenticated;

-- Clerk user id, kept for support look-ups
alter table public.profiles add column if not exists clerk_id text unique;

-- First visit after Google sign-in: create the profile and wallet from the Clerk token.
-- The token carries email, name and picture (Clerk session token claims).
create or replace function public.ensure_profile() returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  me public.profiles;
  c jsonb := public.jwt();
  u uuid := public.uid();
  em text := lower(nullif(btrim(coalesce(c->>'email', '')), ''));
begin
  if u is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  select * into me from public.profiles where id = u;
  if found then
    if me.avatar_url is null and nullif(c->>'picture', '') is not null then
      update public.profiles set avatar_url = c->>'picture' where id = u returning * into me;
    end if;
    return me;
  end if;
  if em is null then raise exception 'Your Google account has no email address'; end if;
  insert into public.profiles (id, email, name, avatar_url, role, referral_code, clerk_id)
  values (u, em, nullif(btrim(coalesce(c->>'name', '')), ''), nullif(c->>'picture', ''),
          case when em = 'premiumservice9366@gmail.com' then 'admin'::public.user_role else 'customer'::public.user_role end,
          public.gen_referral_code(), auth.user_id())
  on conflict (id) do nothing;
  insert into public.wallets (user_id) values (u) on conflict do nothing;
  select * into me from public.profiles where id = u;
  return me;
end $$;
revoke all on function public.ensure_profile() from public, anonymous;
grant execute on function public.ensure_profile() to authenticated;

-- Email goes into the outbox; the worker sends it through Resend within a minute.
create or replace function public._send_email(p_to text, p_name text, p_subject text, p_html text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(p_to, '') = '' then return false; end if;
  insert into public.outbox (channel, to_addr, to_name, subject, body, html)
  values ('email', p_to, p_name, p_subject, p_subject, p_html);
  return true;
end $$;

-- Worker: claim the next paced batch for one channel (daily caps and per-minute pace respected)
create or replace function public._outbox_take(p_channel text, p_limit int default 20) returns setof public.outbox
language plpgsql security definer set search_path = '' as $$
declare m public.messaging_settings; sent_today int; n int;
begin
  select * into m from public.messaging_settings where id = 1;
  update public.outbox set status = 'failed', error = 'No answer from the gateway'
   where status = 'sending' and sent_at < now() - interval '30 minutes';
  select count(*) into sent_today from public.outbox
   where channel = p_channel and status in ('sending', 'sent')
     and sent_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  if p_channel = 'email' then
    n := least(p_limit, m.email_per_minute, greatest(m.email_daily_cap - sent_today, 0));
  elsif p_channel = 'whatsapp' then
    if not m.wa_enabled or m.wa_base_url is null then return; end if;
    n := least(p_limit, m.wa_per_minute, greatest(m.wa_daily_cap - sent_today, 0));
  else
    return;
  end if;
  return query
    update public.outbox o set status = 'sending', sent_at = now()
     where o.id in (select x.id from public.outbox x where x.channel = p_channel and x.status = 'queued'
                    order by x.id limit n for update skip locked)
    returning o.*;
end $$;

create or replace function public._outbox_result(p_id bigint, p_ok boolean, p_error text default null) returns void
language sql security definer set search_path = '' as $$
  update public.outbox set
    status = case when p_ok then 'sent' else 'failed' end,
    error = case when p_ok then null else left(coalesce(p_error, 'Failed'), 300) end,
    sent_at = case when p_ok then now() else sent_at end
  where id = p_id;
$$;
revoke all on function public._outbox_take(text, int), public._outbox_result(bigint, boolean, text) from public, anonymous, authenticated;

-- Keys saved from Admin, Messages (write-only from the app)
create or replace function public.admin_set_secret(p_name text, p_value text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_name not in ('resend_api_key', 'openwa_api_key') then raise exception 'Unknown key'; end if;
  if length(coalesce(btrim(p_value), '')) < 8 then raise exception 'That key looks too short'; end if;
  insert into private.secrets (name, decrypted_secret) values (p_name, btrim(p_value))
  on conflict (name) do update set decrypted_secret = excluded.decrypted_secret, updated_at = now();
end $$;

create or replace function public.admin_messaging_status() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m public.messaging_settings; today timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into m from public.messaging_settings where id = 1;
  return jsonb_build_object(
    'email_key', exists (select 1 from private.secrets where name = 'resend_api_key'),
    'openwa_key', exists (select 1 from private.secrets where name = 'openwa_api_key'),
    'sender', (select support_email from public.settings where id = 1),
    'settings', to_jsonb(m),
    'email', jsonb_build_object(
      'queued', (select count(*) from public.outbox where channel = 'email' and status = 'queued'),
      'sent_today', (select count(*) from public.outbox where channel = 'email' and status = 'sent' and sent_at >= today),
      'failed_today', (select count(*) from public.outbox where channel = 'email' and status = 'failed' and created_at >= today)),
    'whatsapp', jsonb_build_object(
      'queued', (select count(*) from public.outbox where channel = 'whatsapp' and status = 'queued'),
      'sent_today', (select count(*) from public.outbox where channel = 'whatsapp' and status = 'sent' and sent_at >= today),
      'failed_today', (select count(*) from public.outbox where channel = 'whatsapp' and status = 'failed' and created_at >= today)),
    'last_error', (select jsonb_build_object('channel', channel, 'error', error, 'at', created_at)
                     from public.outbox where status = 'failed' order by id desc limit 1));
end $$;

-- Resend's free plan allows 100 emails a day
alter table public.messaging_settings alter column email_daily_cap set default 100;

-- Live updates without websockets: the app asks "anything new since X?" every few seconds
create or replace function public.live_stamp(p_keys text[]) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.uid(); adm boolean := public.is_admin(); r jsonb := '{}'::jsonb; k text;
begin
  foreach k in array p_keys loop
    r := r || jsonb_build_object(k, case k
      when 'notifications' then (select max(created_at) from public.notifications where user_id = u)
      when 'my_orders' then (select max(updated_at) from public.orders where user_id = u)
      when 'agent_orders' then (select max(updated_at) from public.orders where agent_id = u or (public.is_agent() and status in ('packed', 'agent_assigned')))
      when 'wallet' then (select updated_at from public.wallets where user_id = u)
      when 'cart' then (select max(added_at) from public.cart_items where user_id = u)
      when 'all_orders' then case when adm then (select max(updated_at) from public.orders) end
      when 'returns' then case when adm then (select max(updated_at) from public.returns) end
      when 'payments' then case when adm then (select max(created_at) from public.payments) end
      when 'reviews' then case when adm then (select max(created_at) from public.reviews) end
      when 'stock' then (select max(updated_at) from public.products)
      when 'settings' then (select updated_at from public.settings where id = 1)
      else null end);
  end loop;
  return r;
end $$;
grant execute on function public.live_stamp(text[]) to anonymous, authenticated;

-- Cashfree: the worker records the gateway order, and marks it paid when the signed webhook arrives.
create or replace function public._gateway_started(p_order uuid, p_ref text, p_upi text) returns void
language sql security definer set search_path = '' as $$
  update public.payments set gateway_ref = p_ref, raw = coalesce(raw, '{}'::jsonb) || jsonb_build_object('collect_upi', p_upi, 'collect_at', now()), updated_at = now()
   where order_id = p_order and status = 'pending';
$$;

create or replace function public._gateway_paid(p_order uuid, p_utr text, p_amount_paise int, p_raw jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare o public.orders; msg text[];
begin
  select * into o from public.orders where id = p_order for update;
  if not found then return false; end if;
  if o.payment_status = 'paid' then return true; end if;
  if p_amount_paise < o.payable_paise then
    update public.payments set raw = coalesce(raw, '{}'::jsonb) || jsonb_build_object('short_payment', p_raw) where order_id = o.id;
    perform public.notify_admins('payment', 'Short UPI payment on ' || o.order_no, 'Paid ' || public._inr(p_amount_paise) || ' of ' || public._inr(o.payable_paise) || '. Check it in Cashfree.', '/admin/orders/' || o.id);
    return false;
  end if;
  update public.payments set status = 'success', utr = coalesce(nullif(trim(p_utr), ''), utr), raw = coalesce(raw, '{}'::jsonb) || jsonb_build_object('gateway', p_raw), updated_at = now()
   where order_id = o.id;
  update public.orders set payment_status = 'paid', paid_at = now(),
    status = case when status = 'placed' then 'confirmed' else status end,
    confirmed_at = case when status = 'placed' then now() else confirmed_at end
   where id = o.id returning * into o;
  insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'payment_verified', null, 'Confirmed by Cashfree');
  if o.status = 'confirmed' then
    insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'confirmed', null, null);
  end if;
  msg := public._status_message('confirmed', o);
  perform public.notify(o.user_id, 'order', 'Payment received for ' || o.order_no, msg[2], '/orders/' || o.id);
  return true;
end $$;
revoke all on function public._gateway_started(uuid, text, text), public._gateway_paid(uuid, text, int, jsonb) from public, anonymous, authenticated;
