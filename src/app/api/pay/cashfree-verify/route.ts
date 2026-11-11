import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/server";
import { cashfreeReady, getCfOrder } from "@/lib/cashfree";
import { rpc } from "@/lib/admin-db";
import { allow, clientIp, tooMany } from "@/lib/rate-limit";

/**
 * Called when the customer comes back from Cashfree's page. Asks Cashfree directly whether the
 * payment went through and confirms the order straight away (the webhook does the same, as a backup).
 */
export async function POST(req: Request) {
  if (!allow(`cf-verify:${clientIp(req)}`, 20, 300)) return tooMany();
  if (!cashfreeReady()) return NextResponse.json({ paid: false });
  const me = await getSessionProfile();
  if (!me.user) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { order?: string; cf?: string };
  if (!body.order || !body.cf) return NextResponse.json({ paid: false });

  // Own order only (row-level security)
  const { data: o } = await me.supabase.from("orders").select("id, payment_status").eq("id", body.order).maybeSingle();
  if (!o) return NextResponse.json({ paid: false }, { status: 404 });
  if (o.payment_status === "paid") return NextResponse.json({ paid: true });

  const cfo = await getCfOrder(body.cf).catch(() => null);
  if (!cfo || cfo.order_status !== "PAID" || cfo.order_tags?.order !== o.id) return NextResponse.json({ paid: false, status: cfo?.order_status ?? "UNKNOWN" });
  const ok = await rpc<boolean>("_gateway_paid", {
    p_order: o.id, p_utr: null, p_amount_paise: Math.round(Number(cfo.order_amount) * 100), p_raw: { cf_order: cfo.order_id, via: "return" },
  });
  return NextResponse.json({ paid: !!ok });
}
