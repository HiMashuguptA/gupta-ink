-- Search (typo tolerant, colour aware), suggestions, search logging, view tracking

create or replace function public.search_products(p_q text, p_limit int default 40)
returns table (id uuid, group_id uuid, name text, slug text, brand text, variant_label text, colour text,
  images text[], mrp_paise int, price_paise int, discount_pct int, stock int, unit text,
  category_id uuid, category_name text, category_slug text, rating_avg numeric, rating_count int, sold_count int, score real)
language sql stable security invoker set search_path = public, extensions as $$
  with q as (select lower(trim(p_q)) as t),
  scored as (
    select pc.*,
      greatest(
        case when strpos(g.search_text, q.t) > 0 then 1.0 else 0 end,
        word_similarity(q.t, g.search_text),
        (select coalesce(avg(greatest(word_similarity(w, g.search_text), case when strpos(g.search_text, w) > 0 then 1 else 0 end)), 0)
           from unnest(string_to_array(q.t, ' ')) w where length(w) >= 2)
      )
      + coalesce((select max(similarity(w, lower(pc.colour))) * 0.3 from unnest(string_to_array(q.t, ' ')) w where pc.colour is not null and length(w) >= 3), 0)
      as s
    from product_cards pc join product_groups g on g.id = pc.group_id cross join q
    where length(q.t) >= 2
  )
  select id, group_id, name, slug, brand, variant_label, colour, images, mrp_paise, price_paise, discount_pct, stock, unit,
         category_id, category_name, category_slug, rating_avg, rating_count, sold_count, s::real
  from scored
  where s >= 0.42
  order by s desc, sold_count desc, stock > 0 desc
  limit least(p_limit, 100)
$$;
grant execute on function public.search_products(text, int) to anon, authenticated;

create or replace function public.search_suggestions(p_q text)
returns table (kind text, label text, slug text, group_id uuid, category_slug text, image text)
language sql stable security invoker set search_path = public, extensions as $$
  (select 'product'::text, b.name, b.slug, b.group_id, b.category_slug, b.img
     from (select distinct on (s.group_id) s.name, s.slug, s.group_id, s.category_slug, s.images[1] as img, s.score, s.sold_count
             from public.search_products(p_q, 40) s order by s.group_id, s.score desc) b
     order by b.score desc, b.sold_count desc limit 6)
  union all
  (select 'category', c.name, c.slug, null::uuid, c.slug, c.image_url from public.categories c
     where c.active and length(trim(p_q)) >= 2 and (strpos(lower(c.name), lower(trim(p_q))) > 0 or lower(trim(p_q)) <% lower(c.name))
     limit 3)
$$;
grant execute on function public.search_suggestions(text) to anon, authenticated;

create or replace function public.log_search(p_term text, p_results int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if length(trim(p_term)) < 2 or length(p_term) > 80 then return; end if;
  if auth.uid() is not null then perform public.hit_rate_limit('search_log', 60, 60); end if;
  insert into public.search_logs (term, results_count) values (lower(trim(p_term)), greatest(p_results, 0));
end $$;
grant execute on function public.log_search(text, int) to anon, authenticated;

-- Recently viewed keeps every row; the app reads only the latest 12. A scheduled
-- cleanup job (Phase 4) trims old rows.
create or replace function public.track_view(p_group uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.product_groups set view_count = view_count + 1 where id = p_group;
  if auth.uid() is not null then
    insert into public.recently_viewed (user_id, group_id, viewed_at) values (auth.uid(), p_group, now())
    on conflict (user_id, group_id) do update set viewed_at = now();
  end if;
end $$;
grant execute on function public.track_view(uuid) to anon, authenticated;
