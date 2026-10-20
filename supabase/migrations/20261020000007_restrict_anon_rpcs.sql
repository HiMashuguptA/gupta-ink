-- Anonymous visitors can't write analytics (prevents spamming trending counts or
-- filling the free-tier database). Signed-in calls are rate limited.
revoke execute on function public.can_see_order(uuid) from anon, public;
revoke execute on function public.log_search(text, int) from anon, public;
revoke execute on function public.track_view(uuid) from anon, public;
grant execute on function public.log_search(text, int), public.track_view(uuid), public.can_see_order(uuid) to authenticated;

create or replace function public.track_view(p_group uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  perform public.hit_rate_limit('track_view', 120, 3600);
  update public.product_groups set view_count = view_count + 1 where id = p_group;
  insert into public.recently_viewed (user_id, group_id, viewed_at) values (auth.uid(), p_group, now())
  on conflict (user_id, group_id) do update set viewed_at = now();
end $$;
