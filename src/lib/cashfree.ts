import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cashfree Payment Gateway: hosted checkout (UPI, cards, netbanking, wallets), UPI collect
 * requests, and automatic confirmation by signed webhook.
 * Needs CASHFREE_APP_ID and CASHFREE_SECRET_KEY; CASHFREE_ENV=production for live money.
 */
export const cashfreeReady = () => !!(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
const base = () => (process.env.CASHFREE_ENV === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg");

async function cf<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(base() + path, {
    method: init.method ?? "GET",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-api-version": "2023-08-01",
      "x-client-id": process.env.CASHFREE_APP_ID!,
      "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const j = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(j.message || `Cashfree error ${res.status}`);
  return j;
}

export type CfOrder = { order_id: string; order_status: string; order_amount: number; payment_session_id: string; order_tags?: Record<string, string> | null };

type Buyer = { id: string; order_no: string; amount_paise: number; customer_id: string; phone: string; email?: string | null; name?: string | null; return_url: string };

/** A Cashfree order for one of our orders. Each attempt gets its own id (Cashfree ids are single-use). */
async function createCfOrder(o: Buyer, methods?: string) {
  return cf<CfOrder>("/orders", {
    method: "POST",
    body: {
      order_id: `${o.order_no}-${Date.now().toString(36)}`,
      order_amount: Number((o.amount_paise / 100).toFixed(2)),
      order_currency: "INR",
      customer_details: { customer_id: o.customer_id.replace(/-/g, "").slice(0, 32), customer_phone: o.phone, customer_email: o.email ?? undefined, customer_name: o.name ?? undefined },
      order_meta: { return_url: o.return_url, notify_url: new URL("/api/pay/cashfree-webhook", o.return_url).toString(), ...(methods ? { payment_methods: methods } : {}) },
      order_tags: { order: o.id },
      order_note: o.order_no,
    },
  });
}

/** Hosted checkout: the customer picks UPI, card, netbanking or wallet on Cashfree's page. */
export const createCheckout = (o: Buyer) => createCfOrder(o);
export const cashfreeMode = () => (process.env.CASHFREE_ENV === "production" ? "production" : "sandbox");

export async function createUpiCollect(o: Buyer & { upi_id: string }) {
  const order = await createCfOrder(o, "upi");
  await cf("/orders/sessions", {
    method: "POST",
    body: { payment_session_id: order.payment_session_id, payment_method: { upi: { channel: "collect", upi_id: o.upi_id, upi_expiry_minutes: 10 } } },
  });
  return order;
}

export const getCfOrder = (id: string) => cf<CfOrder>(`/orders/${encodeURIComponent(id)}`);

/** Webhook signature: base64(HMAC-SHA256(timestamp + raw body, secret key)). */
export function verifyWebhook(raw: string, ts: string | null, sig: string | null) {
  if (!ts || !sig || !process.env.CASHFREE_SECRET_KEY) return false;
  const want = createHmac("sha256", process.env.CASHFREE_SECRET_KEY).update(ts + raw).digest("base64");
  const a = Buffer.from(want), b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
