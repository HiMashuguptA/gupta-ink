-- The shop trades as Gupta Enterprises (was "Gupta Ink")
update public.settings set store_name = 'Gupta Enterprises' where id = 1;
alter table public.settings alter column store_name set default 'Gupta Enterprises';
do $$
declare f regprocedure; d text;
begin
  for f in select p.oid::regprocedure from pg_proc p where p.pronamespace = 'public'::regnamespace and prokind = 'f'
             and strpos(pg_get_functiondef(p.oid), 'Gupta Ink') > 0 loop
    d := pg_get_functiondef(f);
    execute replace(d, 'Gupta Ink', 'Gupta Enterprises');
  end loop;
end $$;
