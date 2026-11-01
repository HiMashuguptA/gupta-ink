import "server-only";
import { neon } from "@neondatabase/serverless";

/**
 * Background jobs, run by the Cloudflare cron trigger every minute (see worker.ts):
 * sends queued email (Resend) and WhatsApp (OpenWA) in paced batches, and runs the
 * order housekeeping that pg_cron used to run on Supabase.
 * Uses the database owner connection (DATABASE_URL), never exposed to browsers.
 */
type Row = Record<string, unknown>;
export const sql = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
};

async function secret(db: ReturnType<typeof sql>, name: string, env?: string) {
  if (env && process.env[env]) return process.env[env]!;
  const r = (await db`select decrypted_secret from private.secrets where name = ${name}`) as Row[];
  return (r[0]?.decrypted_secret as string | undefined) ?? null;
}

export async function sendOutbox() {
  const db = sql();
  const out = { email: 0, whatsapp: 0, failed: 0 };

  const key = await secret(db, "resend_api_key", "RESEND_API_KEY");
  if (key) {
    const s = (await db`select store_name, support_email from public.settings where id = 1`) as Row[];
    const from = `${s[0]?.store_name ?? "Gupta Enterprises"} <${process.env.EMAIL_FROM ?? s[0]?.support_email ?? "orders@guptaenterpriseskohima.com"}>`;
    const batch = (await db`select * from public._outbox_take('email', 20)`) as Row[];
    for (const m of batch) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({ from, to: [m.to_addr], subject: m.subject ?? "Gupta Enterprises", html: m.html ?? `<p>${String(m.body ?? "")}</p>` }),
        });
        const ok = r.ok;
        await db`select public._outbox_result(${m.id as number}, ${ok}, ${ok ? null : `${r.status} ${(await r.text()).slice(0, 200)}`})`;
        if (ok) out.email++; else out.failed++;
      } catch (e) {
        await db`select public._outbox_result(${m.id as number}, false, ${String(e).slice(0, 200)})`;
        out.failed++;
      }
    }
  }

  const ms = (await db`select wa_enabled, wa_base_url, wa_session from public.messaging_settings where id = 1`) as Row[];
  const waKey = await secret(db, "openwa_api_key", "OPENWA_API_KEY");
  if (ms[0]?.wa_enabled && ms[0]?.wa_base_url && waKey) {
    const base = String(ms[0].wa_base_url).replace(/\/+$/, "");
    const batch = (await db`select * from public._outbox_take('whatsapp', 6)`) as Row[];
    for (const m of batch) {
      try {
        const r = await fetch(`${base}/api/sessions/${ms[0].wa_session}/messages/send-text`, {
          method: "POST",
          headers: { "X-API-Key": waKey, "content-type": "application/json" },
          body: JSON.stringify({ chatId: m.to_addr, text: m.body }),
        });
        await db`select public._outbox_result(${m.id as number}, ${r.ok}, ${r.ok ? null : `${r.status}`})`;
        if (r.ok) out.whatsapp++; else out.failed++;
      } catch (e) {
        await db`select public._outbox_result(${m.id as number}, false, ${String(e).slice(0, 200)})`;
        out.failed++;
      }
    }
  }
  return out;
}

/** The old pg_cron schedule, decided by the current minute (UTC). */
export async function housekeeping(now = new Date()) {
  const db = sql();
  const m = now.getUTCMinutes(), h = now.getUTCHours();
  const ran: string[] = [];
  if (m % 5 === 0) { await db`select public._expire_unpaid_upi()`; ran.push("expire_unpaid_upi"); }
  if (m === 7 || m === 37) { await db`select public._expire_pickups()`; ran.push("expire_pickups"); }
  if (m % 15 === 0) { await db`select public._settle_orders()`; await db`select public._expire_coins()`; ran.push("settle_orders", "expire_coins"); }
  if (h === 4 && m === 30) { await db`select public._remind_expiring_coins()`; ran.push("coin_reminders"); }
  if (h === 3 && m === 0) { await db`select public._cleanup_ordered_carts()`; ran.push("cleanup_carts"); }
  return ran;
}
