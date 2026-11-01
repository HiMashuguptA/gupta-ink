-- Admin can switch scheduled (slot) delivery on or off.
alter table public.settings add column if not exists scheduled_enabled boolean not null default true;
grant update (scheduled_enabled) on public.settings to authenticated;

create or replace function public.quote_order(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; on_ boolean;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  r := public._price_order(auth.uid(), p);
  select scheduled_enabled and not orders_paused into on_ from public.settings where id = 1;
  r := jsonb_set(r, '{availability,scheduled}', to_jsonb(coalesce(on_, false)), true);
  if p->>'type' = 'scheduled' and not coalesce(on_, false) then
    r := jsonb_set(r, '{errors}', coalesce(r->'errors', '[]'::jsonb) || '["Scheduled delivery is not available right now"]'::jsonb, true);
  end if;
  return r;
end $$;

create or replace function public._guard_scheduled() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.type = 'scheduled' and not (select scheduled_enabled from public.settings where id = 1) then
    raise exception 'Scheduled delivery is not available right now';
  end if;
  return new;
end $$;
drop trigger if exists orders_guard_scheduled on public.orders;
create trigger orders_guard_scheduled before insert on public.orders for each row execute function public._guard_scheduled();
revoke all on function public._guard_scheduled() from public, anon, authenticated;
