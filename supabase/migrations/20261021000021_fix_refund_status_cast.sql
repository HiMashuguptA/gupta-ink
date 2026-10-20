-- payment_status needs an explicit cast in admin_refund_return (already in 0018 for fresh installs)
do $$
declare d text;
begin
  d := pg_get_functiondef('public.admin_refund_return(uuid,text,text)'::regprocedure);
  execute replace(d, '''partially_refunded'' end where id', '''partially_refunded'' end::public.payment_status where id');
end $$;
