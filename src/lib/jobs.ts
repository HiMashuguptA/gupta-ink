import "server-only";
import { rpc, secret, select } from "@/lib/admin-db";

/**
 * Background jobs, run by the Cloudflare cron trigger every minute (see worker.ts):
 * sends queued email (Resend) and WhatsApp (OpenWA) in paced batches, and runs the
 * order housekeeping that pg_cron used to run.
 * Uses the server-only Supabase secret key, never exposed to browsers.
 */
type Row = Record<string, unknown>;

export async function sendOutbox() {
  const out = { email: 0, whatsapp: 0, failed: 0 };

  const key = await secret("resend_api_key", "RESEND_API_KEY");
  if (key) {
    const s = await select<Row>("settings", "store_name,support_email", "id=eq.1");
    const from = `${s[0]?.store_name ?? "Gupta Enterprises"} <${process.env.EMAIL_FROM ?? s[0]?.support_email ?? "orders@guptaenterpriseskohima.com"}>`;
    const batch = await rpc<Row[]>("_outbox_take", { p_channel: "email", p_limit: 20 });
    for (const m of batch) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({ from, to: [m.to_addr], subject: m.subject ?? "Gupta Enterprises", html: m.html ?? `<p>${String(m.body ?? "")}</p>` }),
        });
        const ok = r.ok;
        await rpc("_outbox_result", { p_id: m.id, p_ok: ok, p_error: ok ? null : `${r.status} ${(await r.text()).slice(0, 200)}` });
        if (ok) out.email++; else out.failed++;
      } catch (e) {
        await rpc("_outbox_result", { p_id: m.id, p_ok: false, p_error: String(e).slice(0, 200) });
        out.failed++;
      }
    }
  }

  const ms = await select<Row>("messaging_settings", "wa_enabled,wa_base_url,wa_session", "id=eq.1");
  const waKey = await secret("openwa_api_key", "OPENWA_API_KEY");
  if (ms[0]?.wa_enabled && ms[0]?.wa_base_url && waKey) {
    const base = String(ms[0].wa_base_url).replace(/\/+$/, "");
    const batch = await rpc<Row[]>("_outbox_take", { p_channel: "whatsapp", p_limit: 6 });
    for (const m of batch) {
      try {
        const r = await fetch(`${base}/api/sessions/${ms[0].wa_session}/messages/send-text`, {
          method: "POST",
          headers: { "X-API-Key": waKey, "content-type": "application/json" },
          body: JSON.stringify({ chatId: m.to_addr, text: m.body }),
        });
        await rpc("_outbox_result", { p_id: m.id, p_ok: r.ok, p_error: r.ok ? null : `${r.status}` });
        if (r.ok) out.whatsapp++; else out.failed++;
      } catch (e) {
        await rpc("_outbox_result", { p_id: m.id, p_ok: false, p_error: String(e).slice(0, 200) });
        out.failed++;
      }
    }
  }
  return out;
}

/** The old pg_cron schedule, decided by the current minute (UTC). */
export async function housekeeping(now = new Date()) {
  const m = now.getUTCMinutes(), h = now.getUTCHours();
  const ran: string[] = [];
  if (m % 5 === 0) { await rpc("_expire_unpaid_upi"); ran.push("expire_unpaid_upi"); }
  if (m === 7 || m === 37) { await rpc("_expire_pickups"); ran.push("expire_pickups"); }
  if (m % 15 === 0) { await rpc("_settle_orders"); await rpc("_expire_coins"); ran.push("settle_orders", "expire_coins"); }
  if (h === 4 && m === 30) { await rpc("_remind_expiring_coins"); ran.push("coin_reminders"); }
  if (h === 3 && m === 0) { await rpc("_cleanup_ordered_carts"); ran.push("cleanup_carts"); }
  return ran;
}
