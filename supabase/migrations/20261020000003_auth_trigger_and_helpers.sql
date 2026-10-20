-- ---------------------------------------------------------------- sign-up trigger
create or replace function public.gen_referral_code() returns text
language plpgsql set search_path = '' as $$
declare c text;
begin
  loop
    c := 'GI' || upper(substr(translate(encode(extensions.gen_random_bytes(8), 'base64'), '+/=0O1Il', ''), 1, 6));
    exit when length(c) = 8 and not exists (select 1 from public.profiles where referral_code = c);
  end loop;
  return c;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name, avatar_url, role, referral_code)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    case when lower(new.email) = 'premiumservice9366@gmail.com' then 'admin'::public.user_role
         else 'customer'::public.user_role end,
    public.gen_referral_code()
  );
  insert into public.wallets (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- The owner admin account can never be demoted or blocked
create or replace function public.protect_owner_admin() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.email = 'premiumservice9366@gmail.com' and new.role <> 'admin' then
    raise exception 'The store owner account must stay admin';
  end if;
  if new.email <> old.email then
    raise exception 'Email cannot be changed here';
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_owner_admin();

-- ---------------------------------------------------------------- shared helpers
create or replace function public.audit(p_action text, p_target text, p_before jsonb, p_after jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, action, target, before, after)
  values (auth.uid(), p_action, p_target, p_before, p_after);
$$;
revoke execute on function public.audit(text, text, jsonb, jsonb) from anon, authenticated, public;

create or replace function public.notify(p_user uuid, p_type text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, p_type, p_title, p_body, p_link);
$$;
revoke execute on function public.notify(uuid, text, text, text, text) from anon, authenticated, public;

create or replace function public.notify_admins(p_type text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, title, body, link)
  select id, p_type, p_title, p_body, p_link from public.profiles where role = 'admin';
$$;
revoke execute on function public.notify_admins(text, text, text, text) from anon, authenticated, public;

-- Simple fixed-window rate limiter; raises when exceeded
create or replace function public.hit_rate_limit(p_bucket text, p_max int, p_window_seconds int)
returns void language plpgsql security definer set search_path = '' as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
        n int;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  insert into public.rate_limits (user_id, bucket, window_start, hits) values (auth.uid(), p_bucket, w, 1)
  on conflict (user_id, bucket, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into n;
  if n > p_max then raise exception 'Too many requests, please slow down' using errcode = 'P0429'; end if;
end $$;
revoke execute on function public.hit_rate_limit(text, int, int) from anon, authenticated, public;

create or replace function public.require_active() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not public.is_active_user() then raise exception 'Your account is suspended. Please contact the store.' using errcode = '42501'; end if;
end $$;
revoke execute on function public.require_active() from anon, authenticated, public;
