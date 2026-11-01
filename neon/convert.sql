-- Run on the local "replay" database (Supabase-era schema) before dumping the public schema for Neon.
-- Removes everything tied to Supabase Auth, Vault, pg_net, pg_cron, Storage and Realtime.
alter table public.profiles drop constraint if exists profiles_id_fkey;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public._email_send_req(text, text, text, text);
drop function if exists public._wa_send(text, text);
drop function if exists public._process_outbox();
-- The TapReview app's functions lived in the same Supabase project; they are not part of this shop.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'tapreview%' loop
    execute 'drop function ' || f.sig;
  end loop;
end $$;
