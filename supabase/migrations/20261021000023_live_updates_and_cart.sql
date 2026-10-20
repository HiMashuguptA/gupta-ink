-- Ordered items leave the saved cart in the same transaction as the order,
-- so the cart can't come back on reload or on another device.
create or replace function public._order_item_clears_cart() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.cart_items c
   using public.orders o
   where o.id = new.order_id and c.user_id = o.user_id and c.product_id = new.product_id;
  return null;
end $$;
revoke execute on function public._order_item_clears_cart() from anon, authenticated, public;

create or replace trigger order_items_clear_cart after insert on public.order_items
  for each row execute function public._order_item_clears_cart();

-- Clean up carts already left behind by earlier orders
create or replace function public._cleanup_ordered_carts() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with gone as (
    delete from public.cart_items c
     using public.order_items oi join public.orders o on o.id = oi.order_id
     where c.user_id = o.user_id and c.product_id = oi.product_id and c.added_at <= o.created_at
    returning 1)
  select count(*) into n from gone;
  return n;
end $$;
revoke execute on function public._cleanup_ordered_carts() from anon, authenticated, public;
select public._cleanup_ordered_carts();

-- More tables send live changes to open screens (row security still decides who sees what)
do $$
declare t text;
begin
  foreach t in array array['reviews', 'payments', 'coin_ledger', 'wallets', 'cart_items', 'products', 'referrals'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Deletes carry the whole old row, so per-user filters still match them
alter table public.cart_items replica identity full;
alter table public.reviews replica identity full;
