-- Store pickup orders keep who will collect them (name and mobile), like delivery orders keep an address
alter table public.orders add column if not exists pickup_contact jsonb;

do $do$
declare d text; n int;
begin
  d := pg_get_functiondef('public.place_order(jsonb)'::regprocedure);
  n := length(d);
  d := replace(d, $a$payment_status, status, note, idempotency_key, confirmed_at)$a$,
                  $b$payment_status, status, note, idempotency_key, confirmed_at, pickup_contact)$b$);
  d := replace(d, $a$    case when first_status = 'confirmed' then now() end)
  returning * into o;$a$, $b$    case when first_status = 'confirmed' then now() end,
    case when typ = 'pickup' then jsonb_build_object('name', left(trim(p->>'pickup_name'), 80),
      'phone', regexp_replace(coalesce(p->>'pickup_phone', ''), '\D', '', 'g')) end)
  returning * into o;$b$);
  d := replace(d, $a$  insert into public.orders ($a$, $b$  -- Pickup: who collects, and a mobile number the store can call
  if typ = 'pickup' then
    if length(trim(coalesce(p->>'pickup_name', ''))) < 2 then
      raise exception 'Enter the name of the person who will collect the order';
    end if;
    if regexp_replace(coalesce(p->>'pickup_phone', ''), '\D', '', 'g') !~ '^[6-9][0-9]{9}$' then
      raise exception 'Enter a 10-digit mobile number for the pickup';
    end if;
    update public.profiles set phone = regexp_replace(p->>'pickup_phone', '\D', '', 'g')
     where id = uid and coalesce(phone, '') = '';
  end if;

  insert into public.orders ($b$);
  if strpos(d, 'pickup_contact)') = 0 or strpos(d, 'pickup_phone') = 0 or strpos(d, 'who collects') = 0 then
    raise exception 'place_order did not match the expected text; nothing changed';
  end if;
  execute d;
end $do$;
