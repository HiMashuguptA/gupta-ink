-- Realtime for live order tracking and notifications
alter publication supabase_realtime add table
  public.orders, public.order_events, public.agent_locations, public.notifications, public.returns;

-- Storage buckets: images only, 5 MB max
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('products', 'products', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('banners', 'banners', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('reviews', 'reviews', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('returns', 'returns', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('refund-proofs', 'refund-proofs', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "admin manages catalogue images" on storage.objects for all to authenticated
  using (bucket_id in ('products', 'banners') and public.is_admin())
  with check (bucket_id in ('products', 'banners') and public.is_admin());

create policy "users upload own review and return photos" on storage.objects for insert to authenticated
  with check (bucket_id in ('reviews', 'returns') and public.is_active_user() and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users read own return photos" on storage.objects for select to authenticated
  using (bucket_id in ('returns', 'refund-proofs') and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create policy "admin uploads refund proofs" on storage.objects for insert to authenticated
  with check (bucket_id = 'refund-proofs' and public.is_admin());
