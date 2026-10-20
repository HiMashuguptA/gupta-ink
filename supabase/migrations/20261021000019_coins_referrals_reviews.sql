-- Phase 4: SuperCoin crediting and expiry, referral rewards, reviews

alter table public.coin_ledger add column if not exists reminded boolean not null default false;
alter table public.reviews add column if not exists reviewer_name text;
create index if not exists coin_ledger_open_idx on public.coin_ledger (expires_at) where remaining > 0;

-- Gives coins for orders whose return window has closed and that have no open return
create or replace function public._settle_orders() returns int
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders; s public.settings; ref public.referrals; refunded int; base int; earn int; n int := 0;
  exp timestamptz; reward int;
begin
  select * into s from public.settings where id = 1;
  exp := now() + make_interval(days => s.coin_expiry_days);
  reward := s.referral_reward_coins;
  for o in
    select x.* from public.orders x
     where x.status in ('delivered', 'collected') and not x.coins_credited and x.return_window_ends_at < now()
       and not exists (select 1 from public.returns r where r.order_id = x.id
                        and r.status in ('requested', 'approved', 'pickup_assigned', 'picked_up', 'received'))
     order by x.return_window_ends_at
     limit 200
     for update skip locked
  loop
    select coalesce(sum(refund_amount_paise), 0) into refunded from public.returns where order_id = o.id and status = 'refunded';
    base := greatest(0, o.items_total_paise - o.coupon_discount_paise - o.coins_used * 100 - refunded);
    earn := floor(base * s.coin_rate_bp / 10000.0 / 100)::int;
    if earn > 0 then
      insert into public.coin_ledger (user_id, entry, amount, remaining, order_id, note, expires_at)
      values (o.user_id, 'earn', earn, earn, o.id, 'Earned on order ' || o.order_no, exp);
      update public.wallets set coin_balance = coin_balance + earn, updated_at = now() where user_id = o.user_id;
      perform public.notify(o.user_id, 'coins', earn || ' SuperCoins added',
        'From order ' || o.order_no || '. Use them within ' || s.coin_expiry_days || ' days (1 coin = ₹1).', '/account/coins');
    end if;
    update public.orders set coins_credited = true, status = 'completed' where id = o.id;
    insert into public.order_events (order_id, status, actor_id, note) values (o.id, 'completed', null, case when earn > 0 then earn || ' SuperCoins credited' end);

    -- Referral: both people get coins once the friend's first order is kept past its return window
    select * into ref from public.referrals where referee_id = o.user_id and status = 'pending' for update;
    if found and base > 0 and reward > 0 then
      insert into public.coin_ledger (user_id, entry, amount, remaining, order_id, note, expires_at) values
        (ref.referrer_id, 'referral', reward, reward, o.id, 'Referral reward', exp),
        (ref.referee_id, 'referral', reward, reward, o.id, 'Welcome reward for joining with a referral', exp);
      update public.wallets set coin_balance = coin_balance + reward, updated_at = now() where user_id in (ref.referrer_id, ref.referee_id);
      update public.referrals set status = 'rewarded', first_order_id = o.id, rewarded_at = now() where id = ref.id;
      perform public.notify(ref.referrer_id, 'referral', reward || ' referral coins added', 'Your friend''s first order is complete. Thanks for spreading the word!', '/account/coins');
      perform public.notify(ref.referee_id, 'referral', reward || ' referral coins added', 'Thanks for joining with a friend''s code.', '/account/coins');
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public._settle_orders() from anon, authenticated, public;

create or replace function public._expire_coins() returns int
language plpgsql security definer set search_path = '' as $$
declare c public.coin_ledger; n int := 0;
begin
  for c in select * from public.coin_ledger where remaining > 0 and expires_at <= now() order by expires_at limit 500 for update skip locked loop
    insert into public.coin_ledger (user_id, entry, amount, remaining, order_id, note)
    values (c.user_id, 'expire', -c.remaining, 0, c.order_id, 'Expired');
    update public.coin_ledger set remaining = 0 where id = c.id;
    update public.wallets set coin_balance = greatest(0, coin_balance - c.remaining), updated_at = now() where user_id = c.user_id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public._expire_coins() from anon, authenticated, public;

-- One heads-up per person when coins are about to lapse
create or replace function public._remind_expiring_coins() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select user_id, sum(remaining) coins, min(expires_at) soonest from public.coin_ledger
            where remaining > 0 and not reminded and expires_at > now() and expires_at <= now() + interval '2 days'
            group by user_id loop
    perform public.notify(r.user_id, 'coins', r.coins || ' SuperCoins expire soon',
      'Use them before ' || to_char(r.soonest at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI am') || ' on your next order.', '/account/coins');
    update public.coin_ledger set reminded = true
     where user_id = r.user_id and remaining > 0 and not reminded and expires_at <= now() + interval '2 days';
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public._remind_expiring_coins() from anon, authenticated, public;

-- ------------------------------------------------------------- reviews
create or replace function public._refresh_rating(p_group uuid) returns void
language sql security definer set search_path = '' as $$
  update public.product_groups g set
    rating_avg = coalesce((select round(avg(stars)::numeric, 1) from public.reviews where group_id = p_group and not hidden), 0),
    rating_count = (select count(*) from public.reviews where group_id = p_group and not hidden)
  where g.id = p_group;
$$;
revoke execute on function public._refresh_rating(uuid) from anon, authenticated, public;

create or replace function public.submit_review(p_item uuid, p_stars int, p_comment text default null, p_photos text[] default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare oi public.order_items; o public.orders; g uuid; ph text; nm text;
begin
  perform public.require_active();
  perform public.hit_rate_limit('review', 20, 3600);
  select * into oi from public.order_items where id = p_item;
  select * into o from public.orders where id = oi.order_id;
  if oi.id is null or o.user_id is distinct from auth.uid() then raise exception 'You can only review items you bought'; end if;
  if o.status not in ('delivered', 'collected', 'completed') then raise exception 'You can review once the order reaches you'; end if;
  if p_stars is null or p_stars not between 1 and 5 then raise exception 'Pick 1 to 5 stars'; end if;
  if length(coalesce(p_comment, '')) > 1000 then raise exception 'Keep the review under 1000 characters'; end if;
  if coalesce(array_length(p_photos, 1), 0) > 3 then raise exception 'Add up to 3 photos'; end if;
  foreach ph in array coalesce(p_photos, '{}') loop
    if strpos(ph, auth.uid()::text || '/') <> 1 or strpos(ph, '..') > 0 then raise exception 'Upload the photos again'; end if;
  end loop;
  select p.group_id into g from public.products p where p.id = oi.product_id;
  select trim(split_part(coalesce(name, 'Customer'), ' ', 1) || ' ' || coalesce(left(nullif(split_part(name, ' ', 2), ''), 1) || '.', ''))
    into nm from public.profiles where id = auth.uid();
  insert into public.reviews (group_id, product_id, order_item_id, user_id, stars, comment, photos, reviewer_name)
  values (g, oi.product_id, oi.id, auth.uid(), p_stars, nullif(trim(p_comment), ''), coalesce(p_photos, '{}'), nm)
  on conflict (order_item_id) do update set stars = excluded.stars, comment = excluded.comment, photos = excluded.photos, reviewer_name = excluded.reviewer_name;
  update public.order_items set reviewed = true where id = oi.id;
  perform public._refresh_rating(g);
end $$;

create or replace function public.admin_hide_review(p_review uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare g uuid;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  update public.reviews set hidden = coalesce(p_hidden, true) where id = p_review returning group_id into g;
  if g is null then raise exception 'Review not found'; end if;
  perform public._refresh_rating(g);
end $$;

do $$
declare f text;
begin
  foreach f in array array['submit_review(uuid, integer, text, text[])', 'admin_hide_review(uuid, boolean)'] loop
    execute format('revoke execute on function public.%s from anon, public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- Background jobs
select cron.schedule('gi-settle-orders', '*/15 * * * *', 'select public._settle_orders(); select public._expire_coins();');
select cron.schedule('gi-coin-reminders', '30 4 * * *', 'select public._remind_expiring_coins()');  -- 10:00 IST
