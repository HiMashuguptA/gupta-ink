-- Messaging: email (Brevo, free 300/day) and WhatsApp (self-hosted OpenWA gateway).
-- Everything goes through one outbox that a cron job drains in small, paced batches,
-- so a big campaign never floods Brevo's daily limit or gets a WhatsApp number banned.

-- 1. Customer preferences ---------------------------------------------------------------
alter table public.profiles
  add column if not exists wa_opt_in boolean not null default false,
  add column if not exists email_offers boolean not null default true;

create or replace function public.set_message_prefs(p_wa boolean default null, p_email boolean default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  update public.profiles set
    wa_opt_in = coalesce(p_wa, wa_opt_in),
    email_offers = coalesce(p_email, email_offers)
  where id = auth.uid();
end $$;
revoke all on function public.set_message_prefs(boolean, boolean) from public, anon;
grant execute on function public.set_message_prefs(boolean, boolean) to authenticated;

-- 2. Admin-only gateway settings (kept out of the public settings row) ---------------------
create table if not exists public.messaging_settings (
  id int primary key default 1 check (id = 1),
  wa_enabled boolean not null default false,
  wa_base_url text check (wa_base_url is null or wa_base_url ~ '^https://[^\s/]+(/[^\s]*)?$'),
  wa_session text not null default 'default' check (wa_session ~ '^[A-Za-z0-9_-]{1,64}$'),
  wa_per_minute int not null default 6 check (wa_per_minute between 1 and 30),
  wa_daily_cap int not null default 200 check (wa_daily_cap between 1 and 1000),
  email_per_minute int not null default 20 check (email_per_minute between 1 and 60),
  email_daily_cap int not null default 280 check (email_daily_cap between 1 and 300),
  order_updates_wa boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.messaging_settings (id) values (1) on conflict do nothing;
alter table public.messaging_settings enable row level security;
create policy messaging_settings_admin on public.messaging_settings for all using (public.is_admin()) with check (public.is_admin());
revoke all on public.messaging_settings from anon, authenticated;
grant select on public.messaging_settings to authenticated;
grant update (wa_enabled, wa_base_url, wa_session, wa_per_minute, wa_daily_cap, email_per_minute, email_daily_cap, order_updates_wa, updated_at) on public.messaging_settings to authenticated;

-- 3. Campaigns and the outbox ---------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 80),
  body text not null check (length(body) between 3 and 1000),
  link text check (link is null or link ~ '^/[^\s]*$'),
  channels text[] not null check (channels <@ array['inapp', 'email', 'whatsapp']::text[] and cardinality(channels) > 0),
  audience text not null check (audience in ('all', 'inactive', 'never_ordered')),
  inactive_days int check (inactive_days is null or inactive_days between 3 and 365),
  coupon_code text references public.coupons(code) on delete set null,
  recipients int not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.campaigns enable row level security;
create policy campaigns_admin on public.campaigns for select using (public.is_admin());
revoke all on public.campaigns from anon, authenticated;
grant select on public.campaigns to authenticated;

create table if not exists public.outbox (
  id bigint generated always as identity primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  to_addr text not null,
  to_name text,
  subject text,
  body text not null,
  html text,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  request_id bigint,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists outbox_queue on public.outbox (channel, id) where status = 'queued';
create index if not exists outbox_sending on public.outbox (id) where status = 'sending';
create index if not exists outbox_campaign on public.outbox (campaign_id, status);
alter table public.outbox enable row level security;
create policy outbox_admin on public.outbox for select using (public.is_admin());
revoke all on public.outbox from anon, authenticated;
grant select on public.outbox to authenticated;

-- 4. Helpers -------------------------------------------------------------------------------
-- Turn a 10-digit Indian mobile into a WhatsApp chat id
create or replace function public._wa_chat(p_phone text) returns text
language sql immutable set search_path = '' as $$
  select case when regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') ~ '^(91)?[6-9]\d{9}$'
    then '91' || right(regexp_replace(p_phone, '\D', '', 'g'), 10) || '@c.us' end
$$;

-- Plain text to a small branded email
create or replace function public._email_wrap(p_title text, p_body text, p_link text) returns text
language plpgsql stable set search_path = '' as $$
declare s public.settings; site text := 'https://gupta-ink-g22y.vercel.app';
begin
  select * into s from public.settings where id = 1;
  return format($h$
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#14231d">
  <div style="background:#0a4d3b;border-radius:14px 14px 0 0;padding:18px 22px">
    <span style="display:inline-block;background:#f5b800;color:#0a2e24;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:6px 12px;border-radius:8px">%1$s</span>
  </div>
  <div style="border:1px solid #e3e0d6;border-top:0;border-radius:0 0 14px 14px;padding:22px">
    <h2 style="margin:0 0 10px;font-size:22px">%2$s</h2>
    <p style="font-size:15px;line-height:1.55;margin:0 0 18px">%3$s</p>
    <a href="%4$s" style="display:inline-block;background:#f5b800;color:#0a2e24;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:10px">Open the shop</a>
    <p style="color:#6b7280;font-size:12px;margin:22px 0 0">%5$s, Khedi Market, Kohima. You get these because you shop with us. Turn offers off any time in Account.</p>
  </div>
</div>$h$,
    public._html(s.store_name), public._html(p_title),
    replace(public._html(p_body), E'\n', '<br>'),
    site || coalesce(p_link, '/'), public._html(s.legal_name));
end $$;

-- Send one WhatsApp text through the OpenWA gateway; returns the pg_net request id
create or replace function public._wa_send(p_chat text, p_text text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare m public.messaging_settings; k text;
begin
  select * into m from public.messaging_settings where id = 1;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'openwa_api_key';
  if not m.wa_enabled or m.wa_base_url is null or coalesce(k, '') = '' then return null; end if;
  return net.http_post(
    url := rtrim(m.wa_base_url, '/') || '/api/sessions/' || m.wa_session || '/messages/send-text',
    headers := jsonb_build_object('X-API-Key', k, 'content-type', 'application/json'),
    body := jsonb_build_object('chatId', p_chat, 'text', p_text),
    timeout_milliseconds := 15000);
end $$;

-- Brevo send that hands back the request id, so the outbox can check the result
create or replace function public._email_send_req(p_to text, p_name text, p_subject text, p_html text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare k text; s public.settings;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'brevo_api_key';
  if coalesce(k, '') = '' then return null; end if;
  select * into s from public.settings where id = 1;
  return net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', k, 'content-type', 'application/json', 'accept', 'application/json'),
    body := jsonb_build_object(
      'sender', jsonb_build_object('name', s.store_name, 'email', s.support_email),
      'to', jsonb_build_array(jsonb_build_object('email', p_to, 'name', coalesce(nullif(p_name, ''), p_to))),
      'subject', p_subject,
      'htmlContent', p_html));
end $$;

-- 5. The worker: check last minute's results, then send the next paced batch ----------------
create or replace function public._process_outbox() returns void
language plpgsql security definer set search_path = '' as $$
declare m public.messaging_settings; r record; rid bigint; sent_today int; n int;
begin
  select * into m from public.messaging_settings where id = 1;

  -- Results of earlier sends
  update public.outbox o set
    status = case when h.status_code between 200 and 299 then 'sent' else 'failed' end,
    error = case when h.status_code between 200 and 299 then null
                 else left(coalesce(h.error_msg, h.status_code::text || ' ' || coalesce(h.content, '')), 300) end,
    sent_at = case when h.status_code between 200 and 299 then now() else o.sent_at end
  from net._http_response h
  where o.status = 'sending' and h.id = o.request_id;
  update public.outbox set status = 'failed', error = 'No answer from the gateway'
  where status = 'sending' and sent_at < now() - interval '30 minutes';

  -- Email batch
  select count(*) into sent_today from public.outbox where channel = 'email' and status in ('sending', 'sent') and sent_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  n := least(m.email_per_minute, greatest(m.email_daily_cap - sent_today, 0));
  -- No key yet: leave everything queued so it goes out once the key is added
  if not exists (select 1 from vault.secrets where name = 'brevo_api_key') then n := 0; end if;
  for r in select * from public.outbox where channel = 'email' and status = 'queued' order by id limit n for update skip locked loop
    rid := public._email_send_req(r.to_addr, r.to_name, r.subject, coalesce(r.html, public._email_wrap(r.subject, r.body, null)));
    if rid is null then
      update public.outbox set status = 'failed', error = 'Email is not set up (add the Brevo key in Admin, Messages)' where id = r.id;
    else
      update public.outbox set status = 'sending', request_id = rid, sent_at = now() where id = r.id;
    end if;
  end loop;

  -- WhatsApp batch (small and slow on purpose)
  if m.wa_enabled and m.wa_base_url is not null and exists (select 1 from vault.secrets where name = 'openwa_api_key') then
    select count(*) into sent_today from public.outbox where channel = 'whatsapp' and status in ('sending', 'sent') and sent_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
    n := least(m.wa_per_minute, greatest(m.wa_daily_cap - sent_today, 0));
    for r in select * from public.outbox where channel = 'whatsapp' and status = 'queued' order by id limit n for update skip locked loop
      rid := public._wa_send(r.to_addr, r.body);
      if rid is null then
        update public.outbox set status = 'failed', error = 'WhatsApp gateway is not set up' where id = r.id;
      else
        update public.outbox set status = 'sending', request_id = rid, sent_at = now() where id = r.id;
      end if;
    end loop;
  end if;
end $$;

do $$ begin
  perform cron.unschedule('gi-outbox') where exists (select 1 from cron.job where jobname = 'gi-outbox');
  perform cron.schedule('gi-outbox', '* * * * *', 'select public._process_outbox()');
end $$;

-- 6. Order and return updates also go to WhatsApp for people who opted in ----------------------
create or replace function public._forward_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u public.profiles; m public.messaging_settings; chat text; s public.settings;
begin
  if new.type not in ('order', 'return') then return new; end if;
  select * into m from public.messaging_settings where id = 1;
  if not m.wa_enabled or not m.order_updates_wa then return new; end if;
  select * into u from public.profiles where id = new.user_id;
  chat := public._wa_chat(u.phone);
  if not u.wa_opt_in or chat is null then return new; end if;
  select * into s from public.settings where id = 1;
  insert into public.outbox (user_id, channel, to_addr, to_name, subject, body)
  values (u.id, 'whatsapp', chat, u.name, new.title,
    '*' || new.title || '*' || coalesce(E'\n' || new.body, '') ||
    case when new.link is not null then E'\n\nhttps://gupta-ink-g22y.vercel.app' || new.link else '' end ||
    E'\n\n— ' || s.store_name);
  return new;
end $$;
drop trigger if exists notifications_forward on public.notifications;
create trigger notifications_forward after insert on public.notifications for each row execute function public._forward_notification();

-- 7. Admin functions --------------------------------------------------------------------------
-- Who a campaign reaches
create or replace function public._audience(p_audience text, p_days int)
returns table (id uuid, name text, email text, phone text, wa_opt_in boolean, email_offers boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, p.email, p.phone, p.wa_opt_in, p.email_offers
  from public.profiles p
  where p.role = 'customer'
    and case p_audience
      when 'all' then true
      when 'never_ordered' then not exists (select 1 from public.orders o where o.user_id = p.id and o.status <> 'cancelled')
      when 'inactive' then p.created_at < now() - make_interval(days => coalesce(p_days, 30))
        and not exists (select 1 from public.orders o where o.user_id = p.id and o.status <> 'cancelled' and o.created_at >= now() - make_interval(days => coalesce(p_days, 30)))
      else false end
$$;
revoke all on function public._audience(text, int) from public, anon, authenticated;

create or replace function public.admin_audience_count(p_audience text, p_days int default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare j jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select jsonb_build_object(
    'total', count(*),
    'email', count(*) filter (where a.email_offers and coalesce(a.email, '') <> ''),
    'whatsapp', count(*) filter (where a.wa_opt_in and public._wa_chat(a.phone) is not null))
  into j from public._audience(p_audience, p_days) a;
  return j;
end $$;

create or replace function public.admin_send_campaign(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.campaigns; ch text[]; n_in int := 0; n_mail int := 0; n_wa int := 0; s public.settings;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select array_agg(distinct x) into ch from jsonb_array_elements_text(p->'channels') x;
  insert into public.campaigns (title, body, link, channels, audience, inactive_days, coupon_code, created_by)
  values (btrim(p->>'title'), btrim(p->>'body'), nullif(p->>'link', ''), ch, p->>'audience',
    nullif(p->>'inactive_days', '')::int, nullif(p->>'coupon_code', ''), auth.uid())
  returning * into c;
  select * into s from public.settings where id = 1;

  if 'inapp' = any(ch) then
    insert into public.notifications (user_id, type, title, body, link)
    select a.id, 'offer', c.title, replace(c.body, '{name}', coalesce(split_part(a.name, ' ', 1), 'there')), coalesce(c.link, '/')
    from public._audience(c.audience, c.inactive_days) a;
    get diagnostics n_in = row_count;
  end if;
  if 'email' = any(ch) then
    insert into public.outbox (campaign_id, user_id, channel, to_addr, to_name, subject, body, html)
    select c.id, a.id, 'email', a.email, a.name, c.title,
      replace(c.body, '{name}', coalesce(split_part(a.name, ' ', 1), 'there')),
      public._email_wrap(c.title, replace(c.body, '{name}', coalesce(split_part(a.name, ' ', 1), 'there')), c.link)
    from public._audience(c.audience, c.inactive_days) a
    where a.email_offers and coalesce(a.email, '') <> '';
    get diagnostics n_mail = row_count;
  end if;
  if 'whatsapp' = any(ch) then
    insert into public.outbox (campaign_id, user_id, channel, to_addr, to_name, subject, body)
    select c.id, a.id, 'whatsapp', public._wa_chat(a.phone), a.name, c.title,
      '*' || c.title || '*' || E'\n' || replace(c.body, '{name}', coalesce(split_part(a.name, ' ', 1), 'there')) ||
      E'\n\nhttps://gupta-ink-g22y.vercel.app' || coalesce(c.link, '/') ||
      E'\n\n— ' || s.store_name || E'\nTurn off WhatsApp offers any time in Account.'
    from public._audience(c.audience, c.inactive_days) a
    where a.wa_opt_in and public._wa_chat(a.phone) is not null;
    get diagnostics n_wa = row_count;
  end if;

  update public.campaigns set recipients = greatest(n_in, n_mail, n_wa) where id = c.id;
  return jsonb_build_object('id', c.id, 'inapp', n_in, 'email', n_mail, 'whatsapp', n_wa);
end $$;

-- Status for the admin page (never returns secret values, only whether they are set)
create or replace function public.admin_messaging_status() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m public.messaging_settings; today timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into m from public.messaging_settings where id = 1;
  return jsonb_build_object(
    'brevo_key', exists (select 1 from vault.secrets where name = 'brevo_api_key'),
    'openwa_key', exists (select 1 from vault.secrets where name = 'openwa_api_key'),
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
    'last_error', (select jsonb_build_object('channel', channel, 'error', error, 'at', created_at) from public.outbox where status = 'failed' order by id desc limit 1));
end $$;

-- Save a gateway key into Vault (write-only: it can't be read back from the app)
create or replace function public.admin_set_secret(p_name text, p_value text) returns void
language plpgsql security definer set search_path = '' as $$
declare sid uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_name not in ('brevo_api_key', 'openwa_api_key') then raise exception 'Unknown key'; end if;
  if length(coalesce(btrim(p_value), '')) < 8 then raise exception 'That key looks too short'; end if;
  select id into sid from vault.secrets where name = p_name;
  if sid is null then perform vault.create_secret(btrim(p_value), p_name);
  else perform vault.update_secret(sid, btrim(p_value)); end if;
end $$;

-- Send a test message to yourself
create or replace function public.admin_test_message(p_channel text) returns void
language plpgsql security definer set search_path = '' as $$
declare u public.profiles; s public.settings;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into u from public.profiles where id = auth.uid();
  select * into s from public.settings where id = 1;
  if p_channel = 'email' then
    insert into public.outbox (user_id, channel, to_addr, to_name, subject, body, html)
    values (u.id, 'email', u.email, u.name, 'Test email from ' || s.store_name, 'Emails from the shop are working.',
      public._email_wrap('Emails are working', 'This is a test from Admin, Messages. Customers will get offers and delivery codes like this.', '/'));
  elsif p_channel = 'whatsapp' then
    if public._wa_chat(u.phone) is null then raise exception 'Add your 10-digit mobile number in Account first'; end if;
    insert into public.outbox (user_id, channel, to_addr, to_name, subject, body)
    values (u.id, 'whatsapp', public._wa_chat(u.phone), u.name, 'Test', '*WhatsApp is working*' || E'\nThis is a test from ' || s.store_name || ' admin.');
  else raise exception 'Unknown channel'; end if;
end $$;

revoke all on function public.admin_audience_count(text, int) from public, anon;
revoke all on function public.admin_send_campaign(jsonb) from public, anon;
revoke all on function public.admin_messaging_status() from public, anon;
revoke all on function public.admin_set_secret(text, text) from public, anon;
revoke all on function public.admin_test_message(text) from public, anon;
grant execute on function public.admin_audience_count(text, int), public.admin_send_campaign(jsonb), public.admin_messaging_status(),
  public.admin_set_secret(text, text), public.admin_test_message(text) to authenticated;
revoke all on function public._process_outbox(), public._wa_send(text, text), public._email_send_req(text, text, text, text),
  public._forward_notification(), public._email_wrap(text, text, text) from public, anon, authenticated;
