-- Outbox leaves messages queued until the Brevo / OpenWA keys are added (instead of failing them).
create or replace function public._process_outbox() returns void
language plpgsql security definer set search_path = '' as $$
declare m public.messaging_settings; r record; rid bigint; sent_today int; n int;
begin
  select * into m from public.messaging_settings where id = 1;

  -- Results of earlier sends
  update public.outbox o set
    status = case when h.status_code between 200 and 299 then 'sent' else 'failed' end,
    error = case when h.status_code between 200 and 299 then null
                 else left(coalesce(h.error_msg, h.status_code::text || ' ' || coalesce(h.content, '')), 300) end,
    sent_at = case when h.status_code between 200 and 299 then now() else o.sent_at end
  from net._http_response h
  where o.status = 'sending' and h.id = o.request_id;
  update public.outbox set status = 'failed', error = 'No answer from the gateway'
  where status = 'sending' and sent_at < now() - interval '30 minutes';

  -- Email batch
  select count(*) into sent_today from public.outbox where channel = 'email' and status in ('sending', 'sent') and sent_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  n := least(m.email_per_minute, greatest(m.email_daily_cap - sent_today, 0));
  -- No key yet: leave everything queued so it goes out once the key is added
  if not exists (select 1 from vault.secrets where name = 'brevo_api_key') then n := 0; end if;
  for r in select * from public.outbox where channel = 'email' and status = 'queued' order by id limit n for update skip locked loop
    rid := public._email_send_req(r.to_addr, r.to_name, r.subject, coalesce(r.html, public._email_wrap(r.subject, r.body, null)));
    if rid is null then
      update public.outbox set status = 'failed', error = 'Email is not set up (add the Brevo key in Admin, Messages)' where id = r.id;
    else
      update public.outbox set status = 'sending', request_id = rid, sent_at = now() where id = r.id;
    end if;
  end loop;

  -- WhatsApp batch (small and slow on purpose)
  if m.wa_enabled and m.wa_base_url is not null and exists (select 1 from vault.secrets where name = 'openwa_api_key') then
    select count(*) into sent_today from public.outbox where channel = 'whatsapp' and status in ('sending', 'sent') and sent_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
    n := least(m.wa_per_minute, greatest(m.wa_daily_cap - sent_today, 0));
    for r in select * from public.outbox where channel = 'whatsapp' and status = 'queued' order by id limit n for update skip locked loop
      rid := public._wa_send(r.to_addr, r.body);
      if rid is null then
        update public.outbox set status = 'failed', error = 'WhatsApp gateway is not set up' where id = r.id;
      else
        update public.outbox set status = 'sending', request_id = rid, sent_at = now() where id = r.id;
      end if;
    end loop;
  end if;
end $$;revoke all on function public._process_outbox() from public, anon, authenticated;
