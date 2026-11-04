-- Server-only helper: read a key from private.secrets (service_role only, i.e. the shop's server).
create or replace function public._secret_get(p_name text) returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from private.secrets where name = p_name
$$;
revoke all on function public._secret_get(text) from public, anon, authenticated;
grant execute on function public._secret_get(text) to service_role;
-- Server jobs run as service_role through the API.
grant execute on function public._outbox_take(text, int), public._outbox_result(bigint, boolean, text),
  public._gateway_started(uuid, text, text), public._gateway_paid(uuid, text, int, jsonb) to service_role;
