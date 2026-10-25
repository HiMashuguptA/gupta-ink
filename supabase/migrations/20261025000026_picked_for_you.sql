-- Personal "Picked for you": ranks products by what this person bought, viewed, saved and
-- searched for, plus a daily shuffle so the home page looks different every day.

alter table public.search_logs add column if not exists user_id uuid references public.profiles(id) on delete set null;
create index if not exists search_logs_user_idx on public.search_logs (user_id, created_at desc) where user_id is not null;

create or replace function public.log_search(p_term text, p_results integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if length(trim(p_term)) < 2 or length(p_term) > 80 then return; end if;
  if auth.uid() is not null then perform public.hit_rate_limit('search_log', 60, 60); end if;
  insert into public.search_logs (term, results_count, user_id) values (lower(trim(p_term)), greatest(p_results, 0), auth.uid());
end $$;

create or replace function public.picked_for_you(p_limit int default 12) returns setof uuid
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as uid),
  live as (   -- product groups with something in stock
    select g.id, g.category_id, g.search_text, g.sold_count, g.rating_avg, g.rating_count
      from public.product_groups g join public.categories c on c.id = g.category_id and c.active
     where exists (select 1 from public.products p where p.group_id = g.id and p.active and p.stock > 0)
  ),
  bought as (
    select p.group_id, g.category_id, max(o.created_at) last_at
      from me join public.orders o on o.user_id = me.uid and o.status <> 'cancelled'
      join public.order_items oi on oi.order_id = o.id
      join public.products p on p.id = oi.product_id join public.product_groups g on g.id = p.group_id
     group by p.group_id, g.category_id
  ),
  viewed as (
    select rv.group_id, g.category_id from me join public.recently_viewed rv on rv.user_id = me.uid
      join public.product_groups g on g.id = rv.group_id
     where rv.viewed_at > now() - interval '30 days'
  ),
  saved as (
    select distinct p.group_id from me join public.wishlist w on w.user_id = me.uid join public.products p on p.id = w.product_id
  ),
  terms as (
    select distinct s.term from me join public.search_logs s on s.user_id = me.uid
     where s.created_at > now() - interval '30 days' and s.results_count > 0
     limit 8
  ),
  cat_score as (
    select category_id, sum(w) w from (
      select category_id, 3.0 w from bought
      union all select category_id, 1.5 from viewed) x group by category_id
  ),
  scored as (
    select l.id,
        coalesce((select least(w, 9) from cat_score cs where cs.category_id = l.category_id), 0)
      + case when exists (select 1 from saved s where s.group_id = l.id) then 3 else 0 end
      + case when exists (select 1 from viewed v where v.group_id = l.id) then 1.5 else 0 end
      + 2 * (select count(*) from terms t where strpos(l.search_text, t.term) > 0)
      -- just bought it in the last 2 weeks: show it less (consumables come back later)
      - case when exists (select 1 from bought b where b.group_id = l.id and b.last_at > now() - interval '14 days') then 4 else 0 end
      + 0.6 * ln(1 + l.sold_count) + 0.3 * l.rating_avg * least(l.rating_count, 10) / 10.0
      -- daily shuffle, different for each person
      + 2.5 * ((abs(hashtext(coalesce((select uid::text from me), 'guest') || (now() at time zone 'Asia/Kolkata')::date::text || l.id::text)) % 1000) / 1000.0)
      as score
      from live l
  )
  select id from scored order by score desc limit greatest(1, least(p_limit, 30));
$$;
revoke execute on function public.picked_for_you(int) from public;
grant execute on function public.picked_for_you(int) to anon, authenticated;
