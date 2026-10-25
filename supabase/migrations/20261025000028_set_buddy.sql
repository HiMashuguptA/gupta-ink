-- Customers pick, rename or hide their shop buddy. Profiles are column-locked for the
-- authenticated role, so this goes through a narrow function.
create or replace function public.set_buddy(p_pet text default null, p_name text default null, p_hidden boolean default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  if p_pet is not null and p_pet not in ('mochi','pip','bun','hoot') then raise exception 'Unknown buddy'; end if;
  if p_name is not null and (length(btrim(p_name)) < 1 or length(btrim(p_name)) > 20) then raise exception 'Name must be 1 to 20 characters'; end if;
  update profiles set
    pet = coalesce(p_pet, pet),
    pet_name = coalesce(nullif(btrim(p_name), ''), pet_name),
    pet_hidden = coalesce(p_hidden, pet_hidden)
  where id = auth.uid();
end;
$$;
revoke all on function public.set_buddy(text, text, boolean) from public, anon;
grant execute on function public.set_buddy(text, text, boolean) to authenticated;
