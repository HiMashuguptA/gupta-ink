-- Gupta Ink: Row Level Security, privileges, sign-up trigger, referral, search, storage

-- ---------------------------------------------------------------- enable RLS everywhere
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','settings','categories','product_groups','products','banners','home_sections',
    'addresses','wishlist','recently_viewed','cart_items','notifications','push_subscriptions',
    'wallets','coin_ledger','referrals','coupons','coupon_uses','slot_bookings','orders',
    'order_items','order_events','agent_locations','payments','returns','reviews',
    'search_logs','audit_logs','rate_limits'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- Clients may never write these directly; all writes go through functions.
revoke insert, update, delete on
  public.profiles, public.settings, public.wallets, public.coin_ledger, public.referrals,
  public.coupon_uses, public.slot_bookings, public.orders, public.order_items, public.order_events,
  public.payments, public.returns, public.reviews, public.search_logs, public.audit_logs,
  public.rate_limits, public.notifications
from anon, authenticated;
revoke all on public.rate_limits, public.audit_logs from anon;
revoke all on sequence public.order_no_seq from anon, authenticated;

-- Column-level: a user may edit only these profile fields and mark notifications read
grant update (name, phone, avatar_url, welcome_seen, referral_prompt_done, terms_accepted_at) on public.profiles to authenticated;
grant update (read_at) on public.notifications to authenticated;
-- Admin-managed tables keep insert/update/delete grants for authenticated; RLS restricts to admins.
grant update on public.settings to authenticated;
grant insert, update, delete on public.coupons to authenticated;

-- ---------------------------------------------------------------- policies
-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_active_user()) with check (id = auth.uid());

-- settings: everyone reads, admin writes
create policy settings_read on public.settings for select to anon, authenticated using (true);
create policy settings_admin on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- catalogue: public reads active rows, admin full access
create policy categories_read on public.categories for select to anon, authenticated
  using (active or public.is_admin());
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy groups_read on public.product_groups for select to anon, authenticated using (true);
create policy groups_admin on public.product_groups for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy products_read on public.products for select to anon, authenticated
  using (active or public.is_admin());
create policy products_admin on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy banners_read on public.banners for select to anon, authenticated
  using ((active and (start_at is null or start_at <= now()) and (end_at is null or end_at > now())) or public.is_admin());
create policy banners_admin on public.banners for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy sections_read on public.home_sections for select to anon, authenticated using (true);
create policy sections_admin on public.home_sections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- own-row tables
create policy addresses_own on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_active_user());
create policy wishlist_own on public.wishlist for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_active_user());
create policy recent_own on public.recently_viewed for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_own on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_active_user());
create policy push_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_own on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- wallet
create policy wallets_read on public.wallets for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy ledger_read on public.coin_ledger for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy referrals_read on public.referrals for select to authenticated
  using (referrer_id = auth.uid() or referee_id = auth.uid() or public.is_admin());

-- coupons: users see active coupons meant for them
create policy coupons_read on public.coupons for select to authenticated
  using (
    public.is_admin() or (
      active and valid_from <= now() and (valid_to is null or valid_to > now())
      and (audience = 'all' or auth.uid() = any(audience_user_ids))
    )
  );
create policy coupons_admin on public.coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy coupon_uses_read on public.coupon_uses for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy slots_read on public.slot_bookings for select to anon, authenticated using (true);

-- orders: owner, assigned agent, or admin
create or replace function public.can_see_order(o uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders
    where id = o and (user_id = auth.uid() or agent_id = auth.uid()
      or (select role = 'admin' from public.profiles where id = auth.uid()))
  )
$$;

create policy orders_read on public.orders for select to authenticated
  using (user_id = auth.uid() or agent_id = auth.uid() or public.is_admin());
create policy order_items_read on public.order_items for select to authenticated
  using (public.can_see_order(order_id));
create policy order_events_read on public.order_events for select to authenticated
  using (public.can_see_order(order_id));
create policy payments_read on public.payments for select to authenticated
  using (public.can_see_order(order_id));

-- agent location: customer/admin read; only the assigned agent writes, only while delivering
create policy agent_loc_read on public.agent_locations for select to authenticated
  using (public.can_see_order(order_id));
create policy agent_loc_insert on public.agent_locations for insert to authenticated
  with check (
    agent_id = auth.uid() and public.is_agent() and exists (
      select 1 from public.orders o where o.id = order_id and o.agent_id = auth.uid()
        and o.status in ('agent_accepted', 'out_for_delivery'))
  );
create policy agent_loc_update on public.agent_locations for update to authenticated
  using (agent_id = auth.uid())
  with check (
    agent_id = auth.uid() and public.is_agent() and exists (
      select 1 from public.orders o where o.id = order_id and o.agent_id = auth.uid()
        and o.status in ('agent_accepted', 'out_for_delivery'))
  );

create policy returns_read on public.returns for select to authenticated
  using (user_id = auth.uid() or agent_id = auth.uid() or public.is_admin());

create policy reviews_read on public.reviews for select to anon, authenticated
  using (not hidden or user_id = auth.uid() or public.is_admin());

create policy search_logs_admin on public.search_logs for select to authenticated using (public.is_admin());
create policy audit_admin on public.audit_logs for select to authenticated using (public.is_admin());
