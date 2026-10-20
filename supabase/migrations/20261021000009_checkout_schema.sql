-- Phase 2: checkout schema additions and helpers

alter table public.addresses
  add column if not exists distance_sig text,
  add column if not exists distance_at timestamptz;

alter table public.orders
  add column if not exists refund_upi_id text,
  add column if not exists refund_due_paise int not null default 0,
  add column if not exists paid_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists cancelled_at timestamptz;

alter table public.coin_ledger add column if not exists alloc jsonb;

create index if not exists payments_method_day on public.payments (method, created_at);
create index if not exists orders_status_created on public.orders (status, created_at);

-- Rupees for messages: 4900 -> ₹49, 4950 -> ₹49.50
create or replace function public._inr(p int) returns text
language sql immutable set search_path = '' as $$
  select '₹' || regexp_replace(to_char(p / 100.0, 'FM999999990.00'), '\.00$', '')
$$;

create or replace function public._ist_now() returns timestamp
language sql stable set search_path = '' as $$ select (now() at time zone 'Asia/Kolkata') $$;

-- True when the address's road distance was signed by the app server for exactly these coordinates
create or replace function public._distance_sig_ok(a public.addresses) returns boolean
language sql stable security definer set search_path = '' as $$
  select a.distance_sig is not null and a.road_km is not null and a.distance_sig = encode(
    extensions.hmac(
      a.id::text || '|' || round(a.lat::numeric, 6)::text || '|' || round(a.lng::numeric, 6)::text || '|' || round(a.road_km::numeric, 2)::text,
      (select decrypted_secret from vault.decrypted_secrets where name = 'distance_hmac'),
      'sha256'),
    'hex')
$$;

-- Delivery slots for today and the next N days, with live availability
create or replace function public.checkout_slots()
returns table (slot_date date, window_start time, window_end time, capacity int, booked int, available int, open boolean, reason text)
language plpgsql stable security definer set search_path = '' as $$
declare
  s public.settings;
  n timestamp := public._ist_now();
  d date;
  w jsonb;
  st time; en time; b int; why text;
begin
  select * into s from public.settings where id = 1;
  for i in 0 .. s.slot_days_ahead loop
    d := n::date + i;
    for w in select * from jsonb_array_elements(s.slot_windows) loop
      st := (w->>'start')::time; en := (w->>'end')::time;
      select coalesce(sb.booked, 0) into b from public.slot_bookings sb where sb.slot_date = d and sb.window_start = st;
      b := coalesce(b, 0);
      why := case
        when s.orders_paused then 'Ordering is paused'
        when d = any(s.holidays) then 'Store holiday'
        when i = 0 and st < (n::time + interval '60 minutes') then 'Too late to book'
        when b >= s.slot_capacity then 'Full'
        else null end;
      slot_date := d; window_start := st; window_end := en; capacity := s.slot_capacity;
      booked := b; available := greatest(s.slot_capacity - b, 0); open := why is null; reason := why;
      return next;
    end loop;
  end loop;
end $$;

revoke execute on function public._distance_sig_ok(public.addresses) from anon, authenticated, public;
revoke execute on function public.checkout_slots() from anon, public;
grant execute on function public.checkout_slots() to authenticated;
