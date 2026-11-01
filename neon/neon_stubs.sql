-- Local stand-in for Neon's pg_session_jwt, for testing neon/schema.sql on plain Postgres.
create schema if not exists auth;
create or replace function auth.session() returns jsonb language sql stable as $$ select nullif(current_setting('test.jwt', true), '')::jsonb $$;
create or replace function auth.user_id() returns text language sql stable as $$ select auth.session()->>'sub' $$;
grant usage on schema auth to public; grant execute on all functions in schema auth to public;
