-- Expose the variant sort order so listings show each product's default variant first
create or replace view public.product_cards with (security_invoker = true) as
select p.id, p.group_id, p.sku, p.variant_label, p.colour, p.colour_hex, p.unit, p.images,
       p.mrp_paise, p.price_paise, p.stock, p.max_per_order, p.featured,
       round(100.0 * (p.mrp_paise - p.price_paise) / p.mrp_paise)::int as discount_pct,
       g.name, g.slug, g.brand, g.tags, g.category_id, g.seasonal_tag, g.returnable,
       g.rating_avg, g.rating_count, g.sold_count, g.view_count, g.created_at,
       c.name as category_name, c.slug as category_slug,
       p.sort as variant_sort
from public.products p
join public.product_groups g on g.id = p.group_id
join public.categories c on c.id = g.category_id
where p.active and c.active;
