import "server-only";
import { rpc, secret, select } from "@/lib/admin-db";
import { cashfreeReady, createRefund, getRefund } from "@/lib/cashfree";

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

type RefundRow = { id: string; order_id: string; amount_paise: number; reason: string | null; cf_order_id: string; status: "queued" | "pending"; attempts: number };

/**
 * Refunds for online payments: send queued ones to Cashfree, then check pending ones until the
 * bank confirms. The refund id is our own row id, so a retry can never refund twice.
 */
export async function processRefunds() {
  if (!cashfreeReady()) return { skipped: true };
  const rows = await rpc<RefundRow[]>("_refunds_take", { p_limit: 10 });
  const out = { sent: 0, done: 0, failed: 0 };
  for (const g of rows ?? []) {
    const refundId = `rf_${g.id.replace(/-/g, "")}`.slice(0, 40);
    try {
      if (g.status === "queued") {
        try {
          await createRefund(g.cf_order_id, refundId, g.amount_paise, g.reason ?? "Refund");
        } catch (e) {
          // Already created on an earlier try: just track it
          if ((e as { status?: number }).status !== 409) throw e;
        }
        await rpc("_refund_update", { p_id: g.id, p_status: "pending", p_cf_refund_id: refundId });
        out.sent++;
        continue;
      }
      const r = await getRefund(g.cf_order_id, refundId);
      if (r.refund_status === "SUCCESS") {
        await rpc("_refund_update", { p_id: g.id, p_status: "success", p_cf_refund_id: String(r.cf_refund_id ?? refundId) });
        out.done++;
      } else if (r.refund_status === "CANCELLED") {
        await rpc("_refund_update", { p_id: g.id, p_status: "failed", p_error: r.status_description ?? "Refund cancelled by the bank" });
        out.failed++;
      }
    } catch (e) {
      const status = (e as { status?: number }).status ?? 0;
      // Cashfree refused it (bad amount, order not paid, ...): stop and tell the admin. Network/5xx: try again next minute.
      if (status >= 400 && status < 500 && status !== 429) {
        await rpc("_refund_update", { p_id: g.id, p_status: "failed", p_error: e instanceof Error ? e.message : String(e) });
        out.failed++;
      }
    }
  }
  return out;
}
