-- Gupta Enterprises on Supabase (Postgres + PostgREST), sign-in by Clerk (third-party auth).
-- Built by supabase-v2/build.sh from supabase/migrations + neon/extras.sql. Do not edit by hand.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Keys the server needs (email, WhatsApp gateway, distance signing). Never exposed through the API.
create schema if not exists private;
create table if not exists private.secrets (
  name text primary key,
  decrypted_secret text not null,
  updated_at timestamptz not null default now()
);
revoke all on schema private from public, anon, authenticated;

-- The signed-in shopper. Clerk ids ("user_2abc...") become a stable uuid, so every table keeps uuid keys.
create or replace function public.uid() returns uuid
language sql stable set search_path = '' as $$
  select case when coalesce(auth.jwt()->>'sub', '') = '' then null else md5('clerk:' || (auth.jwt()->>'sub'))::uuid end
$$;
create or replace function public.jwt() returns jsonb
language sql stable set search_path = '' as $$ select coalesce(auth.jwt(), '{}'::jsonb) $$;
