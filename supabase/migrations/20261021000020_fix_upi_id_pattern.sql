-- Postgres regex repeat counts stop at 255, so {2,256} made every UPI ID check fail
do $$
declare d text;
begin
  d := pg_get_functiondef('public.cancel_order(uuid,text,text)'::regprocedure);
  execute replace(d, '{2,256}', '{2,64}');
  d := pg_get_functiondef('public.request_return(uuid,jsonb,text,text[],text)'::regprocedure);
  execute replace(d, '{2,256}', '{2,64}');
end $$;
alter table public.returns drop constraint if exists returns_refund_upi_id_check;
alter table public.returns add constraint returns_refund_upi_id_check check (refund_upi_id ~ '^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,64}$');
