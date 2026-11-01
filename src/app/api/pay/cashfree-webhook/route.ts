import { NextResponse } from "next/server";
import { getCfOrder, verifyWebhook } from "@/lib/cashfree";
import { sql } from "@/lib/jobs";

type Hook = {
  type?: string;
  data?: { order?: { order_id?: string; order_tags?: Record<string, string> | null }; payment?: { payment_status?: string; payment_amount?: number; bank_reference?: string; cf_payment_id?: string | number } };
};

/** Cashfree calls this when a payment succeeds; the order is confirmed and the customer gets an email. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("x-webhook-timestamp"), req.headers.get("x-webhook-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  const h = JSON.parse(raw) as Hook;
  const p = h.data?.payment, cfId = h.data?.order?.order_id;
  if (h.type !== "PAYMENT_SUCCESS_WEBHOOK" || p?.payment_status !== "SUCCESS" || !cfId) return NextResponse.json({ ok: true });

  // Ask Cashfree directly before trusting the amount
  const cfo = await getCfOrder(cfId);
  const orderId = cfo.order_tags?.order ?? h.data?.order?.order_tags?.order;
  if (cfo.order_status !== "PAID" || !orderId) return NextResponse.json({ ok: true });
  const paise = Math.round(Number(p.payment_amount ?? cfo.order_amount) * 100);
  await sql()`select public._gateway_paid(${orderId}::uuid, ${p.bank_reference ?? null}, ${paise}::int, ${JSON.stringify({ cf_order: cfId, cf_payment: p.cf_payment_id ?? null })}::jsonb)`;
  return NextResponse.json({ ok: true });
}
