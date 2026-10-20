-- ---------------------------------------------------------------- referral
create or replace function public.apply_referral(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; ref public.profiles;
begin
  perform public.require_active();
  perform public.hit_rate_limit('referral', 5, 3600);
  select * into me from public.profiles where id = auth.uid() for update;
  if me.referred_by is not null then raise exception 'You have already used a referral code'; end if;
  if me.created_at < now() - interval '7 days' then raise exception 'Referral codes can only be used by new users'; end if;
  if exists (select 1 from public.orders where user_id = me.id) then
    raise exception 'Referral codes must be applied before your first order';
  end if;
  select * into ref from public.profiles where referral_code = upper(trim(p_code));
  if ref.id is null then raise exception 'That referral code is not valid'; end if;
  if ref.id = me.id then raise exception 'You cannot use your own code'; end if;
  if ref.role = 'blocked' then raise exception 'That referral code is not valid'; end if;

  update public.profiles set referred_by = ref.id, referral_prompt_done = true where id = me.id;
  insert into public.referrals (referrer_id, referee_id) values (ref.id, me.id);
  perform public.notify(ref.id, 'referral', 'Your friend joined Gupta Ink!',
    coalesce(me.name, 'A friend') || ' used your code. You both get coins after their first order.', '/account/referrals');
  perform public.notify(me.id, 'referral', 'Referral applied',
    'You and ' || coalesce(ref.name, 'your friend') || ' get coins once your first order is delivered and its return window closes.', '/account/referrals');
  return jsonb_build_object('ok', true, 'referrer_name', coalesce(ref.name, 'your friend'));
end $$;
grant execute on function public.apply_referral(text) to authenticated;

create or replace function public.finish_onboarding(p_skip_referral boolean default true, p_welcome_seen boolean default true)
returns void language sql security definer set search_path = '' as $$
  update public.profiles
     set referral_prompt_done = referral_prompt_done or p_skip_referral,
         welcome_seen = welcome_seen or p_welcome_seen,
         terms_accepted_at = coalesce(terms_accepted_at, now())
   where id = auth.uid();
$$;
grant execute on function public.finish_onboarding(boolean, boolean) to authenticated;

-- ---------------------------------------------------------------- admin: roles
create or replace function public.admin_set_role(p_user uuid, p_role public.user_role, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare old_role public.user_role;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then raise exception 'You cannot change your own role'; end if;
  select role into old_role from public.profiles where id = p_user;
  if old_role is null then raise exception 'User not found'; end if;
  update public.profiles
     set role = p_role,
         blocked_reason = case when p_role = 'blocked' then p_reason else null end,
         agent_online = case when p_role = 'delivery_agent' then agent_online else false end
   where id = p_user;
  perform public.audit('set_role', p_user::text, jsonb_build_object('role', old_role), jsonb_build_object('role', p_role, 'reason', p_reason));
  if p_role = 'delivery_agent' then
    perform public.notify(p_user, 'account', 'You are now a delivery agent', 'Open the Agent portal to start taking deliveries.', '/agent');
  end if;
end $$;
grant execute on function public.admin_set_role(uuid, public.user_role, text) to authenticated;
