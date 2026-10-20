-- Phase 3: delivery codes and email

create extension if not exists pg_net with schema extensions;

-- The code lives in its own table that no client can read (orders.otp_hash stays unused).

create table if not exists public.order_otps (
  order_id uuid primary key references public.orders(id) on delete cascade,
  code text not null check (code ~ '^[0-9]{4}$'),
  emailed_count int not null default 0,
  last_emailed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.order_otps enable row level security;
revoke all on public.order_otps from anon, authenticated;

create or replace function public._html(t text) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
$$;

-- Sends through Brevo when an API key named "brevo_api_key" is in Vault. Returns false when email isn't set up.
create or replace function public._send_email(p_to text, p_name text, p_subject text, p_html text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare k text; s public.settings;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'brevo_api_key';
  if coalesce(k, '') = '' or coalesce(p_to, '') = '' then return false; end if;
  select * into s from public.settings where id = 1;
  perform net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', k, 'content-type', 'application/json', 'accept', 'application/json'),
    body := jsonb_build_object(
      'sender', jsonb_build_object('name', s.store_name, 'email', s.support_email),
      'to', jsonb_build_array(jsonb_build_object('email', p_to, 'name', coalesce(nullif(p_name, ''), p_to))),
      'subject', p_subject,
      'htmlContent', p_html));
  return true;
exception when others then
  return false;  -- never block an order because email failed
end $$;
revoke execute on function public._send_email(text, text, text, text) from anon, authenticated, public;

create or replace function public._email_delivery_code(p_order uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare o public.orders; c public.order_otps; u public.profiles; s public.settings; html text; sent boolean;
begin
  select * into o from public.orders where id = p_order;
  select * into c from public.order_otps where order_id = p_order;
  select * into u from public.profiles where id = o.user_id;
  select * into s from public.settings where id = 1;
  if c.code is null then return false; end if;
  html := format($h$
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1f2a44">
  <h2 style="color:#1e2a78;margin:0 0 4px">%1$s</h2>
  <p>Hi %2$s, your order <b>%3$s</b> is out for delivery.</p>
  <p>Give this code to the delivery partner when they hand over your order:</p>
  <p style="font-size:36px;font-weight:800;letter-spacing:10px;background:#f1f3fb;border-radius:12px;padding:16px;text-align:center;margin:12px 0">%4$s</p>
  <p style="color:#6b7280;font-size:13px">Only share it once you have the parcel in hand. %5$s will never ask for it on a call.</p>
  <p style="color:#6b7280;font-size:13px">%6$s, Khedi Market, Kohima. Call %7$s.</p>
</div>$h$,
    public._html(s.store_name), public._html(coalesce(split_part(u.name, ' ', 1), 'there')), o.order_no, c.code,
    public._html(s.store_name), public._html(s.legal_name), s.store_phone);
  sent := public._send_email(u.email, u.name, 'Your delivery code for ' || o.order_no || ': ' || c.code, html);
  if sent then
    update public.order_otps set emailed_count = emailed_count + 1, last_emailed_at = now() where order_id = p_order;
  end if;
  return sent;
end $$;
revoke execute on function public._email_delivery_code(uuid) from anon, authenticated, public;

-- Whenever an order goes out for delivery (agent or admin), make a fresh code and email it
create or replace function public._on_out_for_delivery() returns trigger
language plpgsql security definer set search_path = '' as $$
declare code text;
begin
  code := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 10000)::text, 4, '0');
  insert into public.order_otps (order_id, code) values (new.id, code)
    on conflict (order_id) do update set code = excluded.code, emailed_count = 0, last_emailed_at = null, created_at = now();
  new.otp_attempts := 0;
  perform public._email_delivery_code(new.id);
  return new;
end $$;
revoke execute on function public._on_out_for_delivery() from anon, authenticated, public;

create or replace trigger orders_out_for_delivery before update of status on public.orders
  for each row when (new.status = 'out_for_delivery' and old.status is distinct from 'out_for_delivery')
  execute function public._on_out_for_delivery();

-- The customer can also see their code in the app while the order is out
create or replace function public.my_delivery_code(p_order uuid) returns text
language sql stable security definer set search_path = '' as $$
  select c.code from public.order_otps c join public.orders o on o.id = c.order_id
   where o.id = p_order and o.user_id = auth.uid() and o.status = 'out_for_delivery'
$$;
revoke execute on function public.my_delivery_code(uuid) from anon, public;
grant execute on function public.my_delivery_code(uuid) to authenticated;

-- Live location is visible only while the partner is actually on the way
alter policy agent_loc_read on public.agent_locations
  using (public.is_admin() or (public.can_see_order(order_id) and exists (
    select 1 from public.orders o where o.id = order_id and o.status in ('agent_accepted', 'out_for_delivery'))));
